/// <reference lib="webworker" />
// Runs Whisper in the visitor's browser (transformers.js + onnxruntime-web). Costs the server nothing.
// The library is loaded from the jsDelivr CDN at runtime (bundling onnxruntime-web breaks the Next.js minifier).
const TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.2";

const MODELS: Record<string, string> = {
  small: "onnx-community/whisper-small_timestamped",
  medium: "onnx-community/whisper-medium_timestamped",
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let asr: any = null;
let loaded = "";
const files: Record<string, { loaded: number; total: number }> = {};
let lastPct = 0;

self.onmessage = async (e: MessageEvent<{ audio: Float32Array; language?: string; quality?: string }>) => {
  try {
    const q = e.data.quality === "medium" ? "medium" : "small";
    if (!asr || loaded !== q) {
      for (const k of Object.keys(files)) delete files[k];
      lastPct = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lib: any = await import(/* webpackIgnore: true */ TRANSFORMERS_URL);
      lib.env.allowLocalModels = false;
      asr = await lib.pipeline("automatic-speech-recognition", MODELS[q], {
        dtype: "q8",
        device: "wasm",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        progress_callback: (p: any) => {
          // one overall bar: add up bytes of every model file, and never let the bar go backwards
          if (p?.file && typeof p.total === "number" && p.total > 0 && typeof p.loaded === "number") {
            files[p.file] = { loaded: p.loaded, total: p.total };
            let l = 0, t = 0;
            for (const f of Object.values(files)) { l += f.loaded; t += f.total; }
            // small config files finish first, so use the known model size as the minimum total (keeps the bar honest)
            t = Math.max(t, q === "medium" ? 800e6 : 250e6);
            const pct = Math.min(99, Math.floor((l / t) * 100));
            if (pct > lastPct) { lastPct = pct; self.postMessage({ type: "download", pct }); }
          }
        },
      });
    }
    loaded = q;
    self.postMessage({ type: "transcribing" });
    const out = await asr(e.data.audio, {
      return_timestamps: "word",
      chunk_length_s: 30,
      stride_length_s: 5,
      num_beams: 1,
      task: "transcribe",
      ...(e.data.language ? { language: e.data.language } : {}),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const words = ((out?.chunks as any[]) || [])
      .map((c) => ({ word: String(c.text || "").trim(), start: Number(c.timestamp?.[0] ?? 0), end: Number(c.timestamp?.[1] ?? c.timestamp?.[0] ?? 0) }))
      .filter((w) => w.word);
    self.postMessage({ type: "done", words });
  } catch (err) {
    self.postMessage({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
