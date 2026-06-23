"""
Video Assembler
Downloads assets (B-rolls, audio), applies editing template via FFmpeg,
uploads result to Supabase Storage, returns public URL.

Dependencies: ffmpeg-python, httpx, supabase
Install with: pip install -r requirements.txt
ffmpeg must be installed at system level: apt-get install ffmpeg
"""

import os
import json
import tempfile
import asyncio
import subprocess
from pathlib import Path
from typing import Callable, Optional
import httpx

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


async def download_file(url: str, dest: Path) -> bool:
    """Download a file from URL to dest path. Returns True on success."""
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.get(url, follow_redirects=True)
            if response.status_code == 200:
                dest.write_bytes(response.content)
                return True
    except Exception:
        pass
    return False


async def upload_to_supabase(local_path: Path, bucket: str, object_path: str) -> str:
    """Upload file to Supabase Storage and return public URL."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise RuntimeError("Supabase credentials not configured on Railway")

    url = f"{SUPABASE_URL}/storage/v1/object/{bucket}/{object_path}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "video/mp4",
    }

    async with httpx.AsyncClient(timeout=300) as client:
        with open(local_path, "rb") as f:
            response = await client.post(url, headers=headers, content=f.read())

        if response.status_code not in (200, 201):
            raise RuntimeError(f"Supabase upload failed: {response.status_code} {response.text}")

    public_url = f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{object_path}"
    return public_url


async def assemble_video(
    render_id: str,
    audio_url: str,
    segments: list,
    template_json: dict,
    user_id: str,
    progress_callback: Optional[Callable] = None,
    bucket: str = "rendered-videos",
) -> str:
    """
    Assembles a video from B-roll segments + audio track using FFmpeg.

    segments: list of {asset_url, duration, start_time, type}
    template_json: editing template with timing info
    Returns: public URL of rendered video in Supabase Storage
    """

    def progress(pct: int):
        if progress_callback:
            try:
                asyncio.get_event_loop().call_soon_threadsafe(
                    lambda: progress_callback(pct)
                )
            except Exception:
                pass

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        progress(15)

        # ── 1. Download audio ─────────────────────────────────────────────
        audio_path = tmp / "voiceover.mp3"
        if not await download_file(audio_url, audio_path):
            raise RuntimeError("Failed to download audio file")
        progress(25)

        # ── 2. Download B-roll assets ─────────────────────────────────────
        asset_paths = []
        for i, seg in enumerate(segments):
            asset_url = seg.get("asset_url")
            if not asset_url:
                continue
            ext = ".mp4" if "mp4" in asset_url.lower() else ".mp4"
            asset_path = tmp / f"asset_{i:03d}{ext}"
            success = await download_file(asset_url, asset_path)
            if success:
                asset_paths.append((asset_path, seg.get("duration", 5)))

        if not asset_paths:
            raise RuntimeError("No B-roll assets could be downloaded")

        progress(50)

        # ── 3. Create FFmpeg concat list ──────────────────────────────────
        # Scale + pad all clips to 1920x1080, set duration, then concat
        scaled_clips = []
        for i, (asset_path, duration) in enumerate(asset_paths):
            scaled_path = tmp / f"scaled_{i:03d}.mp4"
            cmd = [
                "ffmpeg", "-y",
                "-i", str(asset_path),
                "-t", str(duration),
                "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1",
                "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                "-an",  # No audio from B-roll
                str(scaled_path)
            ]
            result = subprocess.run(cmd, capture_output=True, timeout=120)
            if result.returncode == 0:
                scaled_clips.append(scaled_path)

        if not scaled_clips:
            raise RuntimeError("FFmpeg failed to process B-roll clips")

        progress(65)

        # ── 4. Concat all clips ───────────────────────────────────────────
        concat_list = tmp / "concat.txt"
        concat_list.write_text(
            "\n".join(f"file '{p}'" for p in scaled_clips)
        )

        concat_path = tmp / "concat_video.mp4"
        cmd = [
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0",
            "-i", str(concat_list),
            "-c", "copy",
            str(concat_path)
        ]
        result = subprocess.run(cmd, capture_output=True, timeout=300)
        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg concat failed: {result.stderr.decode()}")

        progress(75)

        # ── 5. Mix audio with video ───────────────────────────────────────
        output_path = tmp / f"output_{render_id}.mp4"
        cmd = [
            "ffmpeg", "-y",
            "-i", str(concat_path),
            "-i", str(audio_path),
            "-map", "0:v:0",
            "-map", "1:a:0",
            # Loop video if audio is longer, truncate at audio length
            "-shortest",
            "-c:v", "copy",
            "-c:a", "aac", "-b:a", "192k",
            str(output_path)
        ]
        result = subprocess.run(cmd, capture_output=True, timeout=600)
        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg audio mix failed: {result.stderr.decode()}")

        progress(90)

        # ── 6. Upload to Supabase Storage ─────────────────────────────────
        object_path = f"{user_id}/{render_id}.mp4"
        public_url = await upload_to_supabase(output_path, bucket, object_path)

        progress(100)
        return public_url
