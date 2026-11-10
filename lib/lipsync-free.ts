// Lip sync via HuggingFace ZeroGPU Space (MuseTalk) — $0/month
// Requires: npm install @gradio/client
// Env: HF_TOKEN, HF_LIPSYNC_SPACE_URL

export interface LipSyncResult {
  success: boolean;
  outputUrl?: string;
  error?: string;
  processingTimeSeconds?: number;
}

async function downloadAsBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${url}`);
  return res.blob();
}

async function uploadToSupabaseStorage(url: string, jobId: string): Promise<string> {
  const { createServiceClient } = await import("@/lib/supabase/server");
  const supabase = await createServiceClient();

  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  const fileName = `lipsync/${jobId}_${Date.now()}.mp4`;

  const { error } = await supabase.storage
    .from("lipsync-outputs")
    .upload(fileName, buffer, { contentType: "video/mp4", upsert: true });

  if (error) throw error;

  return supabase.storage.from("lipsync-outputs").getPublicUrl(fileName).data.publicUrl;
}

export async function runLipSyncFree(
  videoUrl: string,
  audioUrl: string,
  jobId: string,
  quality: "fast" | "balanced" | "best" = "balanced",
  onProgress?: (status: string) => void
): Promise<LipSyncResult> {
  const startTime = Date.now();

  try {
    const { Client } = await import("@gradio/client");
    onProgress?.("Connecting to GPU...");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = await (Client as any).connect(process.env.HF_LIPSYNC_SPACE_URL!, {
      hf_token: process.env.HF_TOKEN,
    });

    onProgress?.("Downloading video and audio...");
    const videoBlob = await downloadAsBlob(videoUrl);
    const audioBlob = await downloadAsBlob(audioUrl);

    onProgress?.("Syncing lips (2–5 minutes)...");
    const result = await client.predict("/run_lipsync", {
      video_path: videoBlob,
      audio_path: audioBlob,
      quality,
    });

    const outputData = Array.isArray(result.data) ? result.data[0] : result.data;
    if (!outputData) return { success: false, error: "No output from lip sync" };

    const rawUrl = typeof outputData === "string" ? outputData : (outputData as { url: string }).url;
    if (!rawUrl) return { success: false, error: "Invalid output format" };

    onProgress?.("Uploading result...");
    const finalUrl = await uploadToSupabaseStorage(rawUrl, jobId);

    return {
      success: true,
      outputUrl: finalUrl,
      processingTimeSeconds: Math.round((Date.now() - startTime) / 1000),
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Lip sync failed";
    if (msg.includes("timeout")) {
      return {
        success: false,
        error: "GPU queue timeout. The free tier is busy — please try again in a few minutes.",
      };
    }
    return { success: false, error: msg };
  }
}

export async function splitVideoForLipSync(
  videoUrl: string,
  audioUrl: string,
  segmentDuration = 58
): Promise<{ videoSegments: string[]; audioSegments: string[] }> {
  const res = await fetch(`${process.env.FFMPEG_SERVICE_URL}/split-for-lipsync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ video_url: videoUrl, audio_url: audioUrl, segment_duration: segmentDuration }),
  });
  if (!res.ok) throw new Error("Failed to split video for lip sync");
  return res.json();
}

export async function runLipSyncParallel(
  videoSegments: string[],
  audioSegments: string[],
  jobId: string,
  quality: "fast" | "balanced" | "best" = "balanced",
  onProgress?: (completed: number, total: number) => void
): Promise<string[]> {
  const BATCH_SIZE = 3;
  const results: string[] = new Array(videoSegments.length);
  let completed = 0;

  for (let i = 0; i < videoSegments.length; i += BATCH_SIZE) {
    const batch = videoSegments.slice(i, i + BATCH_SIZE);
    const audioBatch = audioSegments.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map((video, idx) =>
        runLipSyncFree(video, audioBatch[idx], `${jobId}_seg${i + idx}`, quality)
      )
    );

    for (let j = 0; j < batchResults.length; j++) {
      const r = batchResults[j];
      results[i + j] = r.status === "fulfilled" && r.value.success
        ? r.value.outputUrl!
        : videoSegments[i + j]; // fallback to original if failed
      completed++;
      onProgress?.(completed, videoSegments.length);
    }
  }

  return results;
}

export async function mergeVideoSegments(
  segmentUrls: string[],
  jobId: string
): Promise<string> {
  const res = await fetch(`${process.env.FFMPEG_SERVICE_URL}/merge-segments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ segment_urls: segmentUrls, job_id: jobId }),
  });
  if (!res.ok) throw new Error("Failed to merge video segments");
  const data = await res.json() as { output_url: string };
  return data.output_url;
}
