"""
TubeTarzan Lip Sync worker - a Hugging Face ZeroGPU Space.

API (used by TubeTarzan, see lib/lipsync-server.ts):
    /run_lipsync(video_url, audio_url, upload_url) -> JSON string
        video_url   signed URL of a face clip (<= 60 s; shorter clips are looped to the audio length)
        audio_url   signed URL of the voice clip for exactly this part
        upload_url  signed Supabase Storage upload URL; the finished MP4 is PUT there
    returns {"ok": true, "seconds": 48.2} or {"ok": false, "error": "..."}

Only the model inference runs inside the @spaces.GPU function, so downloads, audio processing and the final
FFmpeg encode don't use GPU quota.

ENGINE / LICENCE: this file uses Wav2Lip (weights from the camenduru/Wav2Lip mirror). Wav2Lip's official
weights are licensed for personal / research / NON-COMMERCIAL use only. Keep this engine for testing and
admin use. Before selling Lip Sync to customers, swap the engine for one licensed for commercial use
(e.g. MuseTalk, MIT) while keeping the same /run_lipsync API. See README.md.
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import traceback

import numpy as np

# The original Wav2Lip / face-detection code uses aliases removed from newer NumPy
for _alias, _type in (("int", int), ("float", float), ("bool", bool)):
    if not hasattr(np, _alias):
        setattr(np, _alias, _type)

import cv2  # noqa: E402
import gradio as gr  # noqa: E402
import librosa  # noqa: E402
import requests  # noqa: E402
import spaces  # noqa: E402
import torch  # noqa: E402
from huggingface_hub import snapshot_download  # noqa: E402
from scipy import signal  # noqa: E402

# ── model code + weights (downloaded once when the Space starts) ───────────────────────────────────────
WEIGHTS_REPO = os.environ.get("WAV2LIP_REPO", "camenduru/Wav2Lip")
REPO_DIR = snapshot_download(
    WEIGHTS_REPO,
    allow_patterns=["models/*", "face_detection/*", "checkpoints/wav2lip_gan.pth"],
)
sys.path.insert(0, REPO_DIR)

import face_detection  # noqa: E402  (from the Wav2Lip repo)
from models import Wav2Lip  # noqa: E402

DEVICE = "cuda"  # ZeroGPU: CUDA becomes available inside @spaces.GPU functions
IMG_SIZE = 96
MEL_STEP = 16
PADS = (0, 10, 0, 0)  # top, bottom, left, right padding around the detected face (Wav2Lip default)
MAX_HEIGHT = int(os.environ.get("MAX_HEIGHT", "720"))
MAX_DOWNLOAD_BYTES = 60 * 1024 * 1024
ALLOWED_UPLOAD_PREFIX = os.environ.get("ALLOWED_UPLOAD_PREFIX", "").strip()  # e.g. https://xxxx.supabase.co/


def _load_wav2lip():
    ckpt = torch.load(os.path.join(REPO_DIR, "checkpoints", "wav2lip_gan.pth"), map_location="cpu", weights_only=False)
    state = {k.replace("module.", ""): v for k, v in ckpt["state_dict"].items()}
    model = Wav2Lip()
    model.load_state_dict(state)
    return model.to(DEVICE).eval()


MODEL = _load_wav2lip()
DETECTOR = face_detection.FaceAlignment(face_detection.LandmarksType._2D, flip_input=False, device=DEVICE)

# ── optional face-restoration pass (GFPGAN) ─────────────────────────────────────────────────────────────
# Wav2Lip generates the mouth at a low 96x96 resolution, which looks blurry once stretched back onto the
# face. Running GFPGAN on each pasted-back face patch sharpens and restores detail. If this fails to load
# (fragile dependency), Lip Sync still works - it just falls back to Wav2Lip's raw output.
RESTORER = None
try:
    import sys as _sys
    try:
        import torchvision.transforms.functional_tensor  # noqa: F401  (removed in newer torchvision)
    except ModuleNotFoundError:
        import torchvision.transforms.functional as _tv_functional
        _sys.modules["torchvision.transforms.functional_tensor"] = _tv_functional
    from gfpgan import GFPGANer

    RESTORER = GFPGANer(
        model_path="https://github.com/TencentARC/GFPGAN/releases/download/v1.3.0/GFPGANv1.4.pth",
        upscale=1,
        arch="clean",
        channel_multiplier=2,
        bg_upsampler=None,
    )
    print("[GFPGAN] face restoration loaded.")
except Exception as _gfpgan_err:  # noqa: BLE001 - never let a broken optional dependency take the Space down
    print(f"[GFPGAN] face restoration unavailable, continuing with raw Wav2Lip output: {_gfpgan_err}")
    RESTORER = None


def restore_face(patch):
    """Sharpens one pasted-back face patch with GFPGAN. Returns the patch unchanged if restoration fails."""
    if RESTORER is None:
        return patch
    try:
        _, _, restored = RESTORER.enhance(patch, has_aligned=False, only_center_face=True, paste_back=True)
        return restored if restored is not None else patch
    except Exception:  # noqa: BLE001 - one bad frame should not fail the whole clip
        return patch


# ── audio features (same maths as Wav2Lip's audio.py / hparams.py) ────────────────────────────────────
SR, N_FFT, HOP, WIN, N_MELS, FMIN, FMAX = 16000, 800, 200, 800, 80, 55, 7600
PREEMPH, MIN_DB, REF_DB, MAX_ABS = 0.97, -100, 20, 4.0
_MEL_BASIS = librosa.filters.mel(sr=SR, n_fft=N_FFT, n_mels=N_MELS, fmin=FMIN, fmax=FMAX)


def melspectrogram(wav: np.ndarray) -> np.ndarray:
    d = librosa.stft(y=signal.lfilter([1, -PREEMPH], [1], wav), n_fft=N_FFT, hop_length=HOP, win_length=WIN)
    s = 20 * np.log10(np.maximum(np.exp(MIN_DB / 20 * np.log(10)), np.dot(_MEL_BASIS, np.abs(d)))) - REF_DB
    return np.clip((2 * MAX_ABS) * ((s - MIN_DB) / (-MIN_DB)) - MAX_ABS, -MAX_ABS, MAX_ABS)


def mel_chunks_for(wav: np.ndarray, fps: float) -> np.ndarray:
    mel = melspectrogram(wav)
    if np.isnan(mel).any():
        raise ValueError("The audio could not be analysed (silent or corrupted).")
    chunks, i, mult = [], 0, 80.0 / fps
    while True:
        start = int(i * mult)
        if start + MEL_STEP > mel.shape[1]:
            chunks.append(mel[:, mel.shape[1] - MEL_STEP:])
            break
        chunks.append(mel[:, start:start + MEL_STEP])
        i += 1
    return np.asarray(chunks, dtype=np.float32)


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


def video_info(path: str):
    cap = cv2.VideoCapture(path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    cap.release()
    if not np.isfinite(fps) or fps <= 1 or fps > 120:
        fps = 25.0
    return float(fps), frames


def frame_reader(path: str, loop: bool):
    """Yields frames (downscaled to MAX_HEIGHT) forever when loop=True."""
    while True:
        cap = cv2.VideoCapture(path)
        got = False
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            got = True
            h, w = frame.shape[:2]
            if h > MAX_HEIGHT:
                frame = cv2.resize(frame, (int(w * MAX_HEIGHT / h) // 2 * 2, MAX_HEIGHT))
            yield frame
        cap.release()
        if not loop or not got:
            return


def gpu_seconds(face_path, mel_chunks, fps, out_path):  # noqa: ARG001 - signature must match infer()
    # Ask ZeroGPU only for the time this clip needs (quota is reserved per call).
    # The multiplier is higher than Wav2Lip alone needs because GFPGAN restores every pasted-back frame too.
    return int(min(170, 30 + len(mel_chunks) / max(fps, 1) * 2.3))


@spaces.GPU(duration=gpu_seconds)
def infer(face_path: str, mel_chunks: np.ndarray, fps: float, out_path: str) -> None:
    n_out = len(mel_chunks)

    # Pass 1: face boxes for the frames we need (detection in batches, frames not kept in memory)
    boxes, batch = [], []
    first_shape = None

    def detect(imgs):
        preds = DETECTOR.get_detections_for_batch(np.array(imgs))
        for rect, img in zip(preds, imgs):
            if rect is None:
                boxes.append(None)
                continue
            y1 = max(0, rect[1] - PADS[0]); y2 = min(img.shape[0], rect[3] + PADS[1])
            x1 = max(0, rect[0] - PADS[2]); x2 = min(img.shape[1], rect[2] + PADS[3])
            boxes.append([x1, y1, x2, y2])

    n_src = 0
    for frame in frame_reader(face_path, loop=False):
        if first_shape is None:
            first_shape = frame.shape
        batch.append(frame)
        n_src += 1
        if len(batch) == 16:
            detect(batch); batch = []
        if n_src >= n_out:
            break
    if batch:
        detect(batch)
    if not boxes:
        raise ValueError("The face video has no readable frames.")
    known = [b for b in boxes if b is not None]
    if not known:
        raise ValueError("No face found in the video. Use a clip where the face is clearly visible.")
    last = known[0]
    for i, b in enumerate(boxes):  # fill frames where detection failed with the nearest earlier box
        boxes[i] = last = b if b is not None else last
    arr = np.array(boxes, dtype=np.float64)
    for i in range(len(arr)):  # temporal smoothing over 5 frames (Wav2Lip default)
        w = arr[len(arr) - 5:] if i + 5 > len(arr) else arr[i:i + 5]
        arr[i] = np.mean(w, axis=0)
    boxes = arr.astype(int).tolist()

    # Pass 2: generate the mouth for every output frame and write the video (no audio yet)
    h, w = first_shape[:2]
    writer = cv2.VideoWriter(out_path, cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))
    frames_iter = frame_reader(face_path, loop=True)
    imgs, mels, frames, coords = [], [], [], []

    def flush():
        img_b = np.asarray(imgs)
        masked = img_b.copy()
        masked[:, IMG_SIZE // 2:] = 0
        img_t = torch.FloatTensor(np.transpose(np.concatenate((masked, img_b), axis=3) / 255.0, (0, 3, 1, 2))).to(DEVICE)
        mel_t = torch.FloatTensor(np.transpose(np.asarray(mels)[..., None], (0, 3, 1, 2))).to(DEVICE)
        with torch.no_grad():
            pred = MODEL(mel_t, img_t).cpu().numpy().transpose(0, 2, 3, 1) * 255.0
        for p, f, (x1, y1, x2, y2) in zip(pred, frames, coords):
            patch = cv2.resize(p.astype(np.uint8), (x2 - x1, y2 - y1), interpolation=cv2.INTER_CUBIC)
            f[y1:y2, x1:x2] = restore_face(patch)
            writer.write(f)
        imgs.clear(); mels.clear(); frames.clear(); coords.clear()

    for i in range(n_out):
        frame = next(frames_iter)
        x1, y1, x2, y2 = boxes[i % len(boxes)]
        face = frame[y1:y2, x1:x2]
        if face.size == 0:
            writer.write(frame)
            continue
        imgs.append(cv2.resize(face, (IMG_SIZE, IMG_SIZE)))
        mels.append(mel_chunks[i])
        frames.append(frame)
        coords.append((x1, y1, x2, y2))
        if len(imgs) == 128:
            flush()
    if imgs:
        flush()
    writer.release()


def run_lipsync(video_url: str, audio_url: str, upload_url: str) -> str:
    started = time.time()
    tmp = tempfile.mkdtemp()
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

        face, voice, voice16 = f"{tmp}/face.mp4", f"{tmp}/voice", f"{tmp}/voice16.wav"
        raw, final = f"{tmp}/raw.mp4", f"{tmp}/final.mp4"
        download(video_url, face)
        download(audio_url, voice)
        ffmpeg("-i", voice, "-vn", "-ac", "1", "-ar", "16000", voice16)

        wav = librosa.load(voice16, sr=SR)[0]
        seconds = len(wav) / SR
        if seconds > 61:
            raise ValueError("Each clip must be 60 seconds or shorter.")
        fps, _ = video_info(face)
        chunks = mel_chunks_for(wav, fps)

        infer(face, chunks, fps, raw)  # <- the only part that uses GPU time

        ffmpeg("-i", raw, "-i", voice, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "libx264", "-preset", "veryfast",
               "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", final)

        if upload_url:
            with open(final, "rb") as f:
                r = requests.put(upload_url, data=f, headers={"Content-Type": "video/mp4", "x-upsert": "true"}, timeout=180)
            if r.status_code >= 300:
                raise RuntimeError(f"Upload failed ({r.status_code}): {r.text[:200]}")
        return json.dumps({"ok": True, "seconds": round(seconds, 2), "took": round(time.time() - started, 1)})
    except Exception as e:  # noqa: BLE001 - always answer with JSON; quota errors are recognised by the caller
        traceback.print_exc()
        return json.dumps({"ok": False, "error": str(e)[:500]})
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


demo = gr.Interface(
    fn=run_lipsync,
    inputs=[gr.Textbox(label="video_url"), gr.Textbox(label="audio_url"), gr.Textbox(label="upload_url")],
    outputs=gr.Textbox(label="result"),
    title="TubeTarzan Lip Sync worker",
    description="Internal GPU worker for TubeTarzan. Paste signed URLs to test one clip (60 s max).",
    api_name="run_lipsync",
)

if __name__ == "__main__":
    # 3 clips can lip-sync at the same time (TubeTarzan sends up to 3 at once from its key pool).
    # If clips start failing with GPU/memory errors, lower this back toward 1.
    demo.queue(max_size=20, default_concurrency_limit=3).launch()
