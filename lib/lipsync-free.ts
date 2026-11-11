// Lip sync for the One Go pipeline, using the same free Hugging Face ZeroGPU pool as Lip Sync Studio
// (HF_LIPSYNC_SPACE_URL + HF_TOKENS, see hf-space/README.md). One Go clips must be 60 seconds or shorter.

import { createServiceClient } from "@/lib/supabase/server";
import { LIPSYNC_BUCKET, lipsyncConfigured, runOnSpace } from "@/lib/lipsync-server";

export interface LipSyncResult {
  success: boolean;
  outputUrl?: string;
  error?: string;
  processingTimeSeconds?: number;
}

export async function runLipSyncFree(
  videoUrl: string,
  audioUrl: string,
  jobId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _quality: "fast" | "balanced" | "best" = "balanced",
  onProgress?: (status: string) => void
): Promise<LipSyncResult> {
  const startTime = Date.now();
  if (!lipsyncConfigured()) return { success: false, error: "HF_LIPSYNC_SPACE_URL / HF_TOKENS not set" };

  try {
    const svc = await createServiceClient();
    const outputPath = `one-go/${jobId}_${Date.now()}.mp4`;
    const { data: upload, error } = await svc.storage.from(LIPSYNC_BUCKET).createSignedUploadUrl(outputPath, { upsert: true });
    if (error || !upload?.signedUrl) return { success: false, error: `Storage not ready: ${error?.message || "no upload URL"}` };

    onProgress?.("Syncing lips on the GPU…");
    const result = await runOnSpace({ videoUrl, audioUrl, uploadUrl: upload.signedUrl, seconds: 60 });
    if (!result.ok) return { success: false, error: result.error };

    // One Go hands this URL to the next steps, so give it a long-lived signed link (7 days)
    const { data: signed } = await svc.storage.from(LIPSYNC_BUCKET).createSignedUrl(outputPath, 7 * 24 * 3600);
    if (!signed?.signedUrl) return { success: false, error: "Could not create a link to the result" };
    return { success: true, outputUrl: signed.signedUrl, processingTimeSeconds: Math.round((Date.now() - startTime) / 1000) };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Lip sync failed" };
  }
}
