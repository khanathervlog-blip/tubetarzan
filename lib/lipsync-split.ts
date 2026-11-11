/**
 * Browser-side clip preparation for Lip Sync (runs in the visitor's browser with ffmpeg.wasm, so it costs
 * nothing on the server).
 *
 *  - Finds pauses in the voice audio and cuts there, so clips join seamlessly in CapCut.
 *  - Every clip is at most ~50 seconds (hard limit 60) because the free GPU works best with short jobs.
 *  - "split" mode: the face video is as long as the audio -> both are cut at the same points
 *    (video cut on keyframes without re-encoding = fast; audio is cut exactly to match).
 *  - "loop" mode: the face video is 60 s or shorter -> the same face video is used for every clip
 *    (the model loops it) and only the audio is cut.
 */

type FFmpegType = import("@ffmpeg/ffmpeg").FFmpeg;

const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
const TARGET_SECONDS = 50;
const MIN_SECONDS = 25;
const HARD_MAX_SECONDS = 60;
const MAX_FILE_BYTES = 45 * 1024 * 1024; // Supabase free tier allows 50 MB per file

let ffmpegPromise: Promise<FFmpegType> | null = null;
let logSink: ((line: string) => void) | null = null;

async function getFFmpeg(): Promise<FFmpegType> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([import("@ffmpeg/ffmpeg"), import("@ffmpeg/util")]);
      const ff = new FFmpeg();
      ff.on("log", ({ message }) => logSink?.(message));
      await ff.load({
        coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
      });
      return ff;
    })().catch((e) => {
      ffmpegPromise = null;
      throw e;
    });
  }
  return ffmpegPromise;
}

/** Runs one ffmpeg command and returns everything it logged. */
async function run(ff: FFmpegType, args: string[]): Promise<{ code: number; log: string }> {
  const lines: string[] = [];
  logSink = (l) => lines.push(l);
  try {
    const code = await ff.exec(args);
    return { code, log: lines.join("\n") };
  } finally {
    logSink = null;
  }
}

function parseDuration(log: string): number {
  const m = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(log);
  return m ? +m[1] * 3600 + +m[2] * 60 + parseFloat(m[3]) : 0;
}

function parseSilences(log: string, total: number): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  let start: number | null = null;
  for (const line of log.split("\n")) {
    const s = /silence_start:\s*(-?\d+(?:\.\d+)?)/.exec(line);
    if (s) start = Math.max(0, parseFloat(s[1]));
    const e = /silence_end:\s*(\d+(?:\.\d+)?)/.exec(line);
    if (e && start !== null) {
      out.push({ start, end: parseFloat(e[1]) });
      start = null;
    }
  }
  if (start !== null) out.push({ start, end: total });
  return out;
}

/** Cut points: inside a pause between 25 and 50 s after the previous cut, else a hard cut at 50 s. */
export function planCuts(total: number, silences: { start: number; end: number }[]): number[] {
  const cuts: number[] = [];
  let last = 0;
  while (total - last > TARGET_SECONDS) {
    const lo = last + MIN_SECONDS;
    const hi = last + TARGET_SECONDS;
    let best: number | null = null;
    for (const s of silences) {
      const mid = (s.start + s.end) / 2;
      if (mid >= lo && mid <= hi && (best === null || mid > best)) best = mid;
    }
    const cut = Math.round((best ?? hi) * 1000) / 1000;
    cuts.push(cut);
    last = cut;
  }
  // don't leave a tiny last clip: let the previous one run a little longer instead
  if (cuts.length && total - cuts[cuts.length - 1] < 4 && total - (cuts[cuts.length - 2] ?? 0) <= HARD_MAX_SECONDS - 2) cuts.pop();
  return cuts;
}

export interface PreparedJob {
  mode: "split" | "loop";
  clips: { start: number; duration: number }[];
  /** Face video bytes for clip i (in loop mode the same bytes for every clip). */
  video(idx: number): Promise<Uint8Array>;
  /** Voice audio bytes (AAC in .m4a) for clip i. */
  audio(idx: number): Promise<Uint8Array>;
  cleanup(): Promise<void>;
}

const ext = (f: File | Blob) => {
  const n = (f as File).name || "";
  const m = /\.([a-z0-9]+)$/i.exec(n);
  return m ? m[1].toLowerCase() : f.type.includes("webm") ? "webm" : f.type.includes("quicktime") ? "mov" : "mp4";
};

export async function prepareLipsyncJob(
  videoFile: File | Blob,
  audioFile: File | Blob,
  maxRunSeconds: number,
  onStatus: (msg: string) => void
): Promise<PreparedJob> {
  onStatus("Loading the video tools in your browser (first time ~30 MB)…");
  const ff = await getFFmpeg();
  const { fetchFile } = await import("@ffmpeg/util");

  const vIn = `src-video.${ext(videoFile)}`;
  const aIn = `src-audio.${ext(audioFile)}`;
  onStatus("Reading your files…");
  await ff.writeFile(vIn, await fetchFile(videoFile));
  await ff.writeFile(aIn, await fetchFile(audioFile));

  const videoDur = parseDuration((await run(ff, ["-hide_banner", "-i", vIn])).log);
  onStatus("Finding natural pauses in the voice…");
  const silenceLog = (await run(ff, ["-hide_banner", "-i", aIn, "-af", "silencedetect=noise=-32dB:d=0.35", "-f", "null", "-"])).log;
  const audioDur = parseDuration(silenceLog);
  if (!videoDur) throw new Error("Could not read the face video. Try an MP4 file.");
  if (!audioDur) throw new Error("Could not read the voice audio. Try an MP3, M4A or WAV file.");
  if (audioDur > maxRunSeconds + 0.5) {
    throw new Error(`The voice audio is ${Math.round(audioDur)}s but you can lip-sync at most ${Math.floor(maxRunSeconds)}s right now.`);
  }

  const silences = parseSilences(silenceLog, audioDur);
  const files: string[] = [vIn, aIn];
  const audioCache = new Map<number, string>();

  async function cutAudio(clips: { start: number; duration: number }[], idx: number): Promise<Uint8Array> {
    const name = `part${String(idx + 1).padStart(2, "0")}.m4a`;
    if (!audioCache.has(idx)) {
      const c = clips[idx];
      const r = await run(ff, [
        "-hide_banner", "-y", "-ss", c.start.toFixed(3), "-t", c.duration.toFixed(3), "-i", aIn,
        "-vn", "-ac", "1", "-ar", "44100", "-c:a", "aac", "-b:a", "128k", name,
      ]);
      if (r.code !== 0) throw new Error(`Could not cut audio for clip ${idx + 1}.`);
      audioCache.set(idx, name);
      files.push(name);
    }
    return (await ff.readFile(audioCache.get(idx)!)) as Uint8Array;
  }

  // ── loop mode: short face clip reused for every audio clip ──────────────────────────────────────────
  if (videoDur <= HARD_MAX_SECONDS && audioDur > videoDur + 1) {
    const cuts = planCuts(audioDur, silences);
    const bounds = [0, ...cuts, audioDur];
    const clips = bounds.slice(0, -1).map((s, i) => ({ start: s, duration: Math.round((bounds[i + 1] - s) * 1000) / 1000 }));

    onStatus("Preparing the face video…");
    const face = "face.mp4";
    const isSmallMp4 = vIn.endsWith(".mp4") && videoFile.size <= MAX_FILE_BYTES;
    const args = isSmallMp4
      ? ["-hide_banner", "-y", "-i", vIn, "-an", "-c", "copy", face]
      : ["-hide_banner", "-y", "-i", vIn, "-t", "60", "-an", "-vf", "scale=-2:min(720\\,ih)", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "26", "-pix_fmt", "yuv420p", face];
    if ((await run(ff, args)).code !== 0) throw new Error("Could not prepare the face video.");
    files.push(face);
    const faceBytes = (await ff.readFile(face)) as Uint8Array;
    if (faceBytes.byteLength > MAX_FILE_BYTES) throw new Error("The face video is too large. Export it at 720p and try again.");

    return {
      mode: "loop",
      clips,
      video: async () => faceBytes,
      audio: (i) => cutAudio(clips, i),
      cleanup: async () => { for (const f of files) await ff.deleteFile(f).catch(() => {}); },
    };
  }

  if (videoDur < audioDur - 1) {
    throw new Error(
      "The face video is shorter than the voice audio. Use a face video of 60 seconds or less (it will loop), or one at least as long as the audio."
    );
  }

  // ── split mode: cut the long face video on keyframes, then cut the audio to match exactly ───────────
  const total = Math.min(videoDur, audioDur);
  const cuts = planCuts(total, silences);

  async function segment(input: string): Promise<{ name: string; start: number; end: number }[]> {
    for (const f of files.filter((n) => n.startsWith("seg"))) await ff.deleteFile(f).catch(() => {});
    const args = ["-hide_banner", "-y", "-i", input, "-t", total.toFixed(3), "-map", "0:v:0", "-an", "-c", "copy",
      "-f", "segment", "-segment_list", "list.csv", "-segment_list_type", "csv", "-reset_timestamps", "1"];
    if (cuts.length) args.push("-segment_times", cuts.map((c) => c.toFixed(3)).join(","));
    args.push("seg%03d.mp4");
    if ((await run(ff, args)).code !== 0) throw new Error("Could not split the face video.");
    const csv = new TextDecoder().decode((await ff.readFile("list.csv")) as Uint8Array);
    const segs = csv.trim().split(/\r?\n/).filter(Boolean).map((l) => {
      const [name, s, e] = l.split(",");
      return { name: name.trim(), start: parseFloat(s), end: parseFloat(e) };
    });
    files.push("list.csv", ...segs.map((s) => s.name));
    return segs;
  }

  onStatus("Cutting the face video into clips…");
  let segs = await segment(vIn);
  const tooBig = async () => {
    for (const s of segs) {
      if (s.end - s.start > HARD_MAX_SECONDS + 0.5) return true;
      const b = (await ff.readFile(s.name)) as Uint8Array;
      if (b.byteLength > MAX_FILE_BYTES) return true;
    }
    return false;
  };
  if (!segs.length || (await tooBig())) {
    // Few keyframes or a very high bitrate: re-encode once at 720p with a keyframe every second, then cut again
    onStatus("Optimising the video for lip sync (this can take a while for long videos)…");
    const norm = "normalised.mp4";
    const r = await run(ff, [
      "-hide_banner", "-y", "-i", vIn, "-t", total.toFixed(3), "-an", "-vf", "scale=-2:min(720\\,ih)",
      "-c:v", "libx264", "-preset", "ultrafast", "-crf", "26", "-pix_fmt", "yuv420p",
      "-force_key_frames", "expr:gte(t,n_forced*1)", norm,
    ]);
    if (r.code !== 0) throw new Error("Could not optimise the face video.");
    files.push(norm);
    segs = await segment(norm);
    if (!segs.length || (await tooBig())) throw new Error("The video could not be cut into clips under 60 seconds.");
  }

  const clips = segs.map((s) => ({ start: Math.round(s.start * 1000) / 1000, duration: Math.round((s.end - s.start) * 1000) / 1000 }));
  return {
    mode: "split",
    clips,
    video: async (i) => (await ff.readFile(segs[i].name)) as Uint8Array,
    audio: (i) => cutAudio(clips, i),
    cleanup: async () => { for (const f of files) await ff.deleteFile(f).catch(() => {}); },
  };
}
