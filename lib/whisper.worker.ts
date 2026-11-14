/// <reference lib="webworker" />
// Runs Whisper in the visitor's browser (transformers.js + onnxruntime-web). Costs the server nothing.
// The library is loaded from the jsDelivr CDN at runtime (bundling onnxruntime-web breaks the Next.js minifier).
const TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.2";

const MODEL = "onnx-community/whisper-base_timestamped";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let asr: any = null;

self.onmessage = async (e: MessageEvent<{ audio: Float32Array; language?: string }>) => {
  try {
    if (!asr) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lib: any = await import(/* webpackIgnore: true */ TRANSFORMERS_URL);
      lib.env.allowLocalModels = false;
      asr = await lib.pipeline("automatic-speech-recognition", MODEL, {
        dtype: "q8",
        device: "wasm",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        progress_callback: (p: any) => {
          if (p?.status === "progress" && typeof p.progress === "number") self.postMessage({ type: "download", pct: Math.round(p.progress) });
        },
      });
    }
    self.postMessage({ type: "transcribing" });
    const out = await asr(e.data.audio, {
      return_timestamps: "word",
      chunk_length_s: 30,
      stride_length_s: 5,
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
