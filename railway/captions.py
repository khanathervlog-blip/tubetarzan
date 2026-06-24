"""
Captions module for TubeTarzan Railway service.
Uses faster-whisper for transcription + FFmpeg for burning.

Setup on Railway:
  pip install faster-whisper torch
  Model downloads automatically on first use.
"""

import os
import json
import subprocess
import tempfile
from pathlib import Path
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List
import httpx

router = APIRouter(prefix="/captions", tags=["captions"])

SERVICE_TOKEN = os.environ.get("RAILWAY_SERVICE_TOKEN", "change-me-in-production")

def _verify(authorization: Optional[str]):
    if not authorization or authorization != f"Bearer {SERVICE_TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized")


# Lazy-load the whisper model so it only loads when first used
_whisper_model = None

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        try:
            from faster_whisper import WhisperModel
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"
            compute_type = "float16" if torch.cuda.is_available() else "int8"
            _whisper_model = WhisperModel("base", device=device, compute_type=compute_type)
        except ImportError:
            raise RuntimeError("faster-whisper not installed. Run: pip install faster-whisper")
    return _whisper_model


caption_jobs: dict = {}


# ── helpers ───────────────────────────────────────────────────────────────────

async def download_file(url: str, dest: str) -> None:
    async with httpx.AsyncClient(timeout=180) as client:
        r = await client.get(url)
        r.raise_for_status()
        Path(dest).write_bytes(r.content)


def extract_audio(video_path: str, audio_path: str) -> bool:
    result = subprocess.run(
        ["ffmpeg", "-y", "-i", video_path,
         "-vn", "-ar", "16000", "-ac", "1", "-f", "wav", audio_path],
        capture_output=True, text=True
    )
    return result.returncode == 0


def format_srt_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    ms = int((s % 1) * 1000)
    return f"{h:02d}:{m:02d}:{int(s):02d},{ms:03d}"


def format_ass_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    cs = int((s % 1) * 100)
    return f"{h}:{m:02d}:{int(s):02d}.{cs:02d}"


def build_srt(words: list) -> str:
    lines = []
    chunk_size = 10
    for i in range(0, len(words), chunk_size):
        chunk = words[i:i + chunk_size]
        idx = i // chunk_size + 1
        start = format_srt_time(chunk[0]["start"])
        end = format_srt_time(chunk[-1]["end"])
        text = " ".join(w["word"] for w in chunk)
        lines.append(f"{idx}\n{start} --> {end}\n{text}\n")
    return "\n".join(lines)


def build_vtt(words: list) -> str:
    lines = ["WEBVTT\n"]
    chunk_size = 10
    for i in range(0, len(words), chunk_size):
        chunk = words[i:i + chunk_size]
        start = format_srt_time(chunk[0]["start"]).replace(",", ".")
        end = format_srt_time(chunk[-1]["end"]).replace(",", ".")
        text = " ".join(w["word"] for w in chunk)
        lines.append(f"{start} --> {end}\n{text}\n")
    return "\n".join(lines)


def generate_ass(
    words: list,
    style: str,
    font_size: int,
    position: str,
    primary_color: str,
    highlight_color: str,
) -> str:
    # Convert hex #RRGGBB → ASS &H00BBGGRR
    def hex_to_ass(hex_color: str) -> str:
        h = hex_color.lstrip("#")
        if len(h) == 6:
            r, g, b = h[0:2], h[2:4], h[4:6]
            return f"&H00{b}{g}{r}"
        return "&H00FFFFFF"

    primary_ass = hex_to_ass(primary_color)
    highlight_ass = hex_to_ass(highlight_color)

    margin_v = {"bottom": 30, "center": 200, "top": 400}.get(position, 30)

    back_color = "&H80000000"  # semi-transparent black
    border_style = 1
    outline = 2
    bold = -1 if style == "yellow_pop" else 0
    font_name = "Georgia" if style == "netflix" else "Arial"

    if style == "yellow_pop":
        primary_ass = "&H0000FFFF"  # yellow
        back_color = "&H00000000"
        border_style = 3  # box background

    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_name},{font_size},{primary_ass},&H000000FF,&H00000000,{back_color},{bold},0,0,0,100,100,0,0,{border_style},{outline},1,2,10,10,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    events = []
    chunk_size = 7

    if style == "word_highlight":
        for i in range(0, len(words), chunk_size):
            chunk = words[i:i + chunk_size]
            for j, word in enumerate(chunk):
                start_str = format_ass_time(word["start"])
                end_str = format_ass_time(word["end"])
                parts = []
                for k, w in enumerate(chunk):
                    if k == j:
                        parts.append(f"{{\\c{highlight_ass}}}{w['word']}{{\\c{primary_ass}}}")
                    else:
                        parts.append(w["word"])
                events.append(f"Dialogue: 0,{start_str},{end_str},Default,,0,0,0,,{' '.join(parts)}")

    elif style == "karaoke":
        for i in range(0, len(words), chunk_size):
            chunk = words[i:i + chunk_size]
            start_str = format_ass_time(chunk[0]["start"])
            end_str = format_ass_time(chunk[-1]["end"])
            kparts = []
            for w in chunk:
                dur_cs = max(1, int((w["end"] - w["start"]) * 100))
                kparts.append(f"{{\\k{dur_cs}}}{w['word']} ")
            events.append(f"Dialogue: 0,{start_str},{end_str},Default,,0,0,0,,{''.join(kparts)}")

    else:
        for i in range(0, len(words), 10):
            chunk = words[i:i + 10]
            start_str = format_ass_time(chunk[0]["start"])
            end_str = format_ass_time(chunk[-1]["end"])
            text = " ".join(w["word"] for w in chunk)
            events.append(f"Dialogue: 0,{start_str},{end_str},Default,,0,0,0,,{text}")

    return header + "\n".join(events)


# ── endpoints ─────────────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    job_id: str
    video_url: str
    language: Optional[str] = None


@router.post("/generate")
async def generate_captions(
    request: GenerateRequest,
    authorization: Optional[str] = Header(None)
):
    _verify(authorization)

    tmp = tempfile.mkdtemp()
    video_path = f"{tmp}/video.mp4"
    audio_path = f"{tmp}/audio.wav"

    await download_file(request.video_url, video_path)
    if not extract_audio(video_path, audio_path):
        raise HTTPException(status_code=500, detail="Audio extraction failed")

    try:
        model = get_whisper_model()
        segments_gen, info = model.transcribe(
            audio_path,
            language=request.language,
            word_timestamps=True,
            beam_size=5,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 500},
        )
        segments = list(segments_gen)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")

    words = []
    for seg in segments:
        if seg.words:
            for w in seg.words:
                words.append({
                    "word": w.word.strip(),
                    "start": round(w.start, 3),
                    "end": round(w.end, 3),
                    "probability": round(w.probability, 3),
                })

    srt = build_srt(words)

    return {
        "success": True,
        "language_detected": info.language,
        "duration": info.duration,
        "words": words,
        "srt": srt,
        "segment_count": len(segments),
        "word_count": len(words),
    }


class BurnRequest(BaseModel):
    job_id: str
    video_url: str
    words: List[dict]
    style: str = "classic_white"
    font_size: int = 24
    position: str = "bottom"
    primary_color: str = "#FFFFFF"
    highlight_color: str = "#FFD200"


@router.post("/burn")
async def burn_captions(
    request: BurnRequest,
    authorization: Optional[str] = Header(None)
):
    _verify(authorization)

    caption_jobs[request.job_id] = {
        "status": "burning", "progress": 10,
        "output_path": None, "error": None
    }

    tmp = tempfile.mkdtemp()
    video_path = f"{tmp}/input.mp4"
    ass_path = f"{tmp}/captions.ass"
    output_path = f"{tmp}/captioned.mp4"

    try:
        caption_jobs[request.job_id]["progress"] = 20
        await download_file(request.video_url, video_path)

        caption_jobs[request.job_id]["progress"] = 40
        ass_content = generate_ass(
            request.words,
            request.style,
            request.font_size,
            request.position,
            request.primary_color,
            request.highlight_color,
        )
        Path(ass_path).write_text(ass_content, encoding="utf-8")

        caption_jobs[request.job_id]["progress"] = 60
        result = subprocess.run(
            ["ffmpeg", "-y", "-i", video_path,
             "-vf", f"ass={ass_path}",
             "-c:v", "libx264", "-crf", "23", "-preset", "fast",
             "-c:a", "copy", output_path],
            capture_output=True, text=True
        )

        if result.returncode != 0 or not os.path.exists(output_path):
            raise RuntimeError(f"FFmpeg burn failed: {result.stderr[-500:]}")

        caption_jobs[request.job_id] = {
            "status": "complete", "progress": 100,
            "output_path": output_path, "error": None
        }

    except Exception as e:
        caption_jobs[request.job_id] = {
            "status": "failed", "progress": 0,
            "output_path": None, "error": str(e)
        }

    return caption_jobs[request.job_id]


@router.get("/status/{job_id}")
async def get_caption_status(
    job_id: str,
    authorization: Optional[str] = Header(None)
):
    _verify(authorization)
    job = caption_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
