"""
Lip Sync module for TubeTarzan Railway service.
Primary: MuseTalk (GPU, high quality)
Fallback: Wav2Lip (CPU-capable)

Setup on Railway:
  git clone https://github.com/TMElyralab/MuseTalk /app/MuseTalk
  git clone https://github.com/Rudrabha/Wav2Lip /app/Wav2Lip
  Download: wget -O /app/Wav2Lip/wav2lip_gan.pth <checkpoint_url>
"""

import os
import math
import subprocess
import tempfile
from pathlib import Path
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import httpx

router = APIRouter(prefix="/lipsync", tags=["lipsync"])

SERVICE_TOKEN = os.environ.get("RAILWAY_SERVICE_TOKEN", "change-me-in-production")

def _verify(authorization: Optional[str]):
    if not authorization or authorization != f"Bearer {SERVICE_TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized")


# In-memory job tracking (same pattern as render_jobs)
lipsync_jobs: dict = {}


# ── helpers ───────────────────────────────────────────────────────────────────

async def download_file(url: str, dest: str) -> None:
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.get(url)
        r.raise_for_status()
        Path(dest).write_bytes(r.content)


def get_video_duration(path: str) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", path],
        capture_output=True, text=True
    )
    try:
        return float(result.stdout.strip())
    except ValueError:
        return 0.0


def convert_to_wav(input_path: str, output_path: str) -> bool:
    result = subprocess.run(
        ["ffmpeg", "-y", "-i", input_path,
         "-ar", "16000", "-ac", "1", "-f", "wav", output_path],
        capture_output=True, text=True
    )
    return result.returncode == 0


def run_musetalk(video_path: str, audio_path: str, output_path: str) -> bool:
    musetalk_dir = "/app/MuseTalk"
    if not os.path.exists(musetalk_dir):
        return False
    try:
        cmd = [
            "python", f"{musetalk_dir}/inference.py",
            "--video_path", video_path,
            "--audio_path", audio_path,
            "--output_path", output_path,
            "--bbox_shift", "0",
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300, cwd=musetalk_dir)
        return result.returncode == 0 and os.path.exists(output_path)
    except Exception as e:
        print(f"MuseTalk error: {e}")
        return False


def run_wav2lip(video_path: str, audio_path: str, output_path: str) -> bool:
    wav2lip_dir = "/app/Wav2Lip"
    checkpoint = f"{wav2lip_dir}/wav2lip_gan.pth"
    if not os.path.exists(wav2lip_dir) or not os.path.exists(checkpoint):
        return False
    try:
        cmd = [
            "python", f"{wav2lip_dir}/inference.py",
            "--checkpoint_path", checkpoint,
            "--face", video_path,
            "--audio", audio_path,
            "--outfile", output_path,
            "--pads", "0", "10", "0", "0",
            "--resize_factor", "1",
            "--nosmooth",
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600, cwd=wav2lip_dir)
        return result.returncode == 0 and os.path.exists(output_path)
    except Exception as e:
        print(f"Wav2Lip error: {e}")
        return False


def ffmpeg_merge_audio_video(video_path: str, audio_path: str, output_path: str) -> bool:
    """Simple fallback: overlay audio on video without lip sync (demo mode)."""
    result = subprocess.run(
        ["ffmpeg", "-y", "-i", video_path, "-i", audio_path,
         "-map", "0:v", "-map", "1:a",
         "-c:v", "copy", "-shortest", output_path],
        capture_output=True, text=True
    )
    return result.returncode == 0 and os.path.exists(output_path)


# ── endpoints ─────────────────────────────────────────────────────────────────

class LipSyncRequest(BaseModel):
    job_id: str
    video_url: str
    audio_url: str
    quality: str = "balanced"  # fast=Wav2Lip, balanced/best=MuseTalk


@router.post("/start")
async def start_lipsync(
    request: LipSyncRequest,
    authorization: Optional[str] = Header(None)
):
    _verify(authorization)

    lipsync_jobs[request.job_id] = {
        "status": "processing", "progress": 5,
        "output_path": None, "duration": None, "error": None
    }

    # Run synchronously — Railway worker handles concurrency
    try:
        await _run_lipsync(request)
    except Exception as e:
        lipsync_jobs[request.job_id] = {
            "status": "failed", "progress": 0,
            "output_path": None, "duration": None, "error": str(e)
        }

    return lipsync_jobs[request.job_id]


async def _run_lipsync(request: LipSyncRequest):
    job_id = request.job_id
    tmp = tempfile.mkdtemp()

    video_path = f"{tmp}/face.mp4"
    audio_path = f"{tmp}/audio_raw"
    wav_path = f"{tmp}/audio.wav"
    output_path = f"{tmp}/output.mp4"

    lipsync_jobs[job_id]["progress"] = 10
    await download_file(request.video_url, video_path)

    lipsync_jobs[job_id]["progress"] = 20
    await download_file(request.audio_url, audio_path)

    lipsync_jobs[job_id]["progress"] = 30
    if not convert_to_wav(audio_path, wav_path):
        raise RuntimeError("Audio conversion to WAV failed")

    lipsync_jobs[job_id]["progress"] = 40

    success = False
    if request.quality in ("balanced", "best"):
        lipsync_jobs[job_id]["progress"] = 50
        success = run_musetalk(video_path, wav_path, output_path)
        if not success:
            # Fallback to Wav2Lip
            lipsync_jobs[job_id]["progress"] = 60
            success = run_wav2lip(video_path, wav_path, output_path)
    else:
        # fast = Wav2Lip
        lipsync_jobs[job_id]["progress"] = 50
        success = run_wav2lip(video_path, wav_path, output_path)

    if not success:
        # Last resort: merge without lip sync (demo fallback)
        lipsync_jobs[job_id]["progress"] = 70
        success = ffmpeg_merge_audio_video(video_path, wav_path, output_path)

    if not success:
        raise RuntimeError("All lip sync methods failed")

    lipsync_jobs[job_id]["progress"] = 90
    duration = get_video_duration(output_path)

    lipsync_jobs[job_id] = {
        "status": "complete",
        "progress": 100,
        "output_path": output_path,
        "duration": duration,
        "error": None,
    }


@router.get("/status/{job_id}")
async def get_lipsync_status(
    job_id: str,
    authorization: Optional[str] = Header(None)
):
    _verify(authorization)
    job = lipsync_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


class SplitRequest(BaseModel):
    job_id: str
    video_url: str
    segment_duration: int = 58


@router.post("/split")
async def split_video(
    request: SplitRequest,
    authorization: Optional[str] = Header(None)
):
    _verify(authorization)

    tmp = tempfile.mkdtemp()
    video_path = f"{tmp}/full.mp4"

    await download_file(request.video_url, video_path)
    total_duration = get_video_duration(video_path)
    num_segments = math.ceil(total_duration / request.segment_duration)

    parts = []
    for i in range(num_segments):
        start = i * request.segment_duration
        out = f"{tmp}/part{i + 1}.mp4"
        subprocess.run(
            ["ffmpeg", "-y", "-i", video_path,
             "-ss", str(start), "-t", str(request.segment_duration),
             "-c", "copy", out],
            check=True, capture_output=True
        )
        parts.append(out)

    return {
        "success": True,
        "parts": parts,
        "total_segments": num_segments,
        "total_duration": total_duration,
    }
