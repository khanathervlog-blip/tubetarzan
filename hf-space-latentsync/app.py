"""
TubeTarzan Lip Sync worker - LatentSync (ByteDance, Apache-2.0) on a Hugging Face ZeroGPU Space.

This file REPLACES app.py in a duplicate of the public Space "fffiloni/LatentSync" (that Space already has
the latentsync/ package, configs/ and a requirements.txt that installs on ZeroGPU). See README.md here.

API (used by TubeTarzan, see lib/lipsync-server.ts):
    /run_lipsync(video_url, audio_url, upload_url) -> JSON string
        video_url   signed URL of a face clip (the first 10 s are used)
        audio_url   signed URL of the voice clip for exactly this part (10 s or shorter)
        upload_url  signed Supabase Storage upload URL; the finished MP4 is PUT there
    returns {"ok": true, "seconds": 8.2, "took": 95.1} or {"ok": false, "error": "..."}

Only the model run happens inside the @spaces.GPU function; downloads, audio conversion and the upload do not
use GPU quota. The heavy weights are loaded once on the CPU at startup and moved to the GPU per call.
"""


def _patch_asyncio_event_loop_del():
    """Silences a harmless asyncio teardown error sometimes seen in Spaces containers."""
    try:
        import asyncio.base_events as base_events

        original_del = getattr(base_events.BaseEventLoop, "__del__", None)
        if original_del is None:
            return

        def patched_del(self):
            try:
                original_del(self)
            except ValueError as e:
                if "Invalid file descriptor" not in str(e):
                    raise

        base_events.BaseEventLoop.__del__ = patched_del
    except Exception:
        pass


_patch_asyncio_event_loop_del()

import json
import os
import shutil
import subprocess
import tempfile
import time
import traceback
import uuid

import gradio as gr
import requests
import spaces
import torch
from huggingface_hub import snapshot_download

os.makedirs("checkpoints", exist_ok=True)
snapshot_download(repo_id="ByteDance/LatentSync", local_dir="./checkpoints")

from diffusers import AutoencoderKL, DDIMScheduler  # noqa: E402
from omegaconf import OmegaConf  # noqa: E402

from latentsync.models.unet import UNet3DConditionModel  # noqa: E402
from latentsync.pipelines.lipsync_pipeline import LipsyncPipeline  # noqa: E402
from latentsync.whisper.audio2feature import Audio2Feature  # noqa: E402

MAX_DOWNLOAD_BYTES = 60 * 1024 * 1024
MAX_AUDIO_SECONDS = 12.0  # TubeTarzan cuts clips of at most 10 s
MAX_VIDEO_SECONDS = 10.0
ALLOWED_UPLOAD_PREFIX = os.environ.get("ALLOWED_UPLOAD_PREFIX", "").strip()  # e.g. https://xxxx.supabase.co/

# ── models: loaded once on the CPU (allowed on ZeroGPU), moved to the GPU inside infer() ───────────────
CONFIG = OmegaConf.load("configs/unet/second_stage.yaml")
SCHEDULER = DDIMScheduler.from_pretrained("configs")
VAE = AutoencoderKL.from_pretrained("stabilityai/sd-vae-ft-mse", torch_dtype=torch.float16)
VAE.config.scaling_factor = 0.18215
VAE.config.shift_factor = 0
UNET, _ = UNet3DConditionModel.from_pretrained(
    OmegaConf.to_container(CONFIG.model), "checkpoints/latentsync_unet.pt", device="cpu"
)
UNET = UNET.to(dtype=torch.float16)

if CONFIG.model.cross_attention_dim == 768:
    WHISPER_PATH = "checkpoints/whisper/small.pt"
elif CONFIG.model.cross_attention_dim == 384:
    WHISPER_PATH = "checkpoints/whisper/tiny.pt"
else:
    raise NotImplementedError("cross_attention_dim must be 768 or 384")


# ── helpers ──────────────────────────────────────────────────────────────────────────────────────────
def download(url: str, dest: str) -> None:
    with requests.get(url, stream=True, timeout=120) as r:
        r.raise_for_status()
        size = 0
        with open(dest, "wb") as f:
            for part in r.iter_content(1 << 20):
                size += len(part)
                if size > MAX_DOWNLOAD_BYTES:
                    raise ValueError("Input file is larger than 60 MB.")
                f.write(part)


def ffmpeg(*args: str) -> None:
    res = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args], capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {res.stderr[-400:]}")


def duration_of(path: str) -> float:
    res = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", path],
        capture_output=True, text=True,
    )
    try:
        return float(res.stdout.strip())
    except ValueError:
        return 0.0


def gpu_seconds(video_path, audio_path, seconds):  # noqa: ARG001 - signature must match infer()
    # Ask ZeroGPU only for what this clip needs (quota is reserved per call). The reference Space reserves
    # 180 s for an 8-10 s clip; shorter clips reserve less.
    return int(min(180, 50 + seconds * 13))


@spaces.GPU(duration=gpu_seconds)
def infer(video_path: str, audio_path: str, seconds: float) -> str:
    audio_encoder = Audio2Feature(model_path=WHISPER_PATH, device="cuda", num_frames=CONFIG.data.num_frames)
    pipeline = LipsyncPipeline(vae=VAE, audio_encoder=audio_encoder, unet=UNET, scheduler=SCHEDULER).to("cuda")
    torch.seed()
    out_path = f"video_out_{uuid.uuid4().hex}.mp4"
    pipeline(
        video_path=video_path,
        audio_path=audio_path,
        video_out_path=out_path,
        video_mask_path=out_path.replace(".mp4", "_mask.mp4"),
        num_frames=CONFIG.data.num_frames,
        num_inference_steps=CONFIG.run.inference_steps,
        guidance_scale=1.0,
        weight_dtype=torch.float16,
        width=CONFIG.data.resolution,
        height=CONFIG.data.resolution,
    )
    return out_path


def run_lipsync(video_url: str, audio_url: str, upload_url: str) -> str:
    started = time.time()
    tmp = tempfile.mkdtemp()
    out_path = None
    try:
        if not video_url or not audio_url:
            raise ValueError("video_url and audio_url are required.")
        # SECURITY: this Space is public - only work on files in your own Supabase storage
        if ALLOWED_UPLOAD_PREFIX:
            for u in (video_url, audio_url, upload_url):
                if u and not u.startswith(ALLOWED_UPLOAD_PREFIX):
                    raise ValueError("URL is not allowed.")
        for u in (video_url, audio_url, upload_url):
            if u and not u.startswith("https://"):
                raise ValueError("Only https URLs are accepted.")

        raw_video, raw_audio = f"{tmp}/face_raw", f"{tmp}/voice_raw"
        face, voice = f"{tmp}/face.mp4", f"{tmp}/voice.wav"
        download(video_url, raw_video)
        download(audio_url, raw_audio)

        # voice -> 16 kHz mono wav (what the model expects); face -> first 10 s, 25 fps, no audio, even size
        ffmpeg("-i", raw_audio, "-vn", "-ac", "1", "-ar", "16000", voice)
        seconds = duration_of(voice)
        if seconds <= 0.3:
            raise ValueError("The audio could not be read or is empty.")
        if seconds > MAX_AUDIO_SECONDS:
            raise ValueError(f"Each clip must be {int(MAX_AUDIO_SECONDS)} seconds or shorter.")
        ffmpeg(
            "-i", raw_video, "-t", str(MAX_VIDEO_SECONDS), "-an", "-r", "25",
            "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
            "-pix_fmt", "yuv420p", face,
        )

        out_path = infer(face, voice, seconds)  # <- the only part that uses GPU time

        if upload_url:
            with open(out_path, "rb") as f:
                r = requests.put(upload_url, data=f, headers={"Content-Type": "video/mp4", "x-upsert": "true"}, timeout=180)
            if r.status_code >= 300:
                raise RuntimeError(f"Upload failed ({r.status_code}): {r.text[:200]}")
        return json.dumps({"ok": True, "seconds": round(seconds, 2), "took": round(time.time() - started, 1)})
    except Exception as e:  # noqa: BLE001 - always answer with JSON; quota errors are recognised by the caller
        traceback.print_exc()
        return json.dumps({"ok": False, "error": str(e)[:500]})
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
        if out_path:
            for p in (out_path, out_path.replace(".mp4", "_mask.mp4")):
                try:
                    os.remove(p)
                except OSError:
                    pass


demo = gr.Interface(
    fn=run_lipsync,
    inputs=[gr.Textbox(label="video_url"), gr.Textbox(label="audio_url"), gr.Textbox(label="upload_url")],
    outputs=gr.Textbox(label="result"),
    title="TubeTarzan Lip Sync worker (LatentSync)",
    description="Internal GPU worker for TubeTarzan. Paste signed URLs to test one clip (10 s max).",
    api_name="run_lipsync",
)

if __name__ == "__main__":
    demo.queue(max_size=20, default_concurrency_limit=1).launch(show_error=True, ssr_mode=False)
