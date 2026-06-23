"""
TubeTarzan Railway Microservice
Handles: Pattern analysis (scene detection) + Video assembly (FFmpeg)

Deploy to Railway.app:
1. Push this railway/ folder to a new GitHub repo (or same repo)
2. Create new Railway project → Deploy from GitHub
3. Set environment variables (see .env.example comments below)
4. Copy the Railway service URL to FFMPEG_SERVICE_URL in Vercel

Required env vars on Railway:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- OPENAI_API_KEY (for scene classification)
- PORT (Railway sets this automatically)
"""

import os
import json
import tempfile
import asyncio
from pathlib import Path
from fastapi import FastAPI, HTTPException, BackgroundTasks, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import httpx
import uvicorn

from pattern_analyzer import analyze_video_pattern
from video_assembler import assemble_video

app = FastAPI(title="TubeTarzan Media Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://tubetarzan.com", "https://*.tubetarzan.com", "http://localhost:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)

# Simple auth token for Railway → Next.js communication
SERVICE_TOKEN = os.environ.get("RAILWAY_SERVICE_TOKEN", "change-me-in-production")

def verify_token(authorization: Optional[str] = Header(None)):
    if not authorization or authorization != f"Bearer {SERVICE_TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized")


# ─── Health check ────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "tubetarzan-media"}


# ─── Pattern Analyzer ────────────────────────────────────────────────────────

class PatternRequest(BaseModel):
    youtube_url: str
    video_id: str
    user_id: str

class PatternJob(BaseModel):
    job_id: str
    status: str

pattern_jobs: dict = {}

@app.post("/pattern/analyze")
async def start_pattern_analysis(
    request: PatternRequest,
    background_tasks: BackgroundTasks,
    authorization: Optional[str] = Header(None)
):
    verify_token(authorization)

    job_id = f"pattern_{request.video_id}_{request.user_id[:8]}"
    pattern_jobs[job_id] = {"status": "processing", "result": None, "error": None}

    background_tasks.add_task(
        run_pattern_analysis,
        job_id,
        request.youtube_url,
        request.video_id,
        request.user_id
    )

    return {"job_id": job_id, "status": "processing"}

async def run_pattern_analysis(job_id: str, youtube_url: str, video_id: str, user_id: str):
    try:
        result = await analyze_video_pattern(youtube_url, video_id)
        pattern_jobs[job_id] = {"status": "complete", "result": result, "error": None}
    except Exception as e:
        pattern_jobs[job_id] = {"status": "failed", "result": None, "error": str(e)}

@app.get("/pattern/status/{job_id}")
async def get_pattern_status(
    job_id: str,
    authorization: Optional[str] = Header(None)
):
    verify_token(authorization)
    job = pattern_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


# ─── Video Assembler ─────────────────────────────────────────────────────────

class AssembleRequest(BaseModel):
    render_id: str
    audio_url: str
    segments: list  # List of {asset_url, duration, start_time}
    template_json: dict
    user_id: str
    supabase_storage_bucket: str = "rendered-videos"

render_jobs: dict = {}

@app.post("/render/assemble")
async def start_render(
    request: AssembleRequest,
    background_tasks: BackgroundTasks,
    authorization: Optional[str] = Header(None)
):
    verify_token(authorization)

    job_id = f"render_{request.render_id}"
    render_jobs[job_id] = {
        "status": "queued",
        "progress": 0,
        "output_url": None,
        "error": None
    }

    background_tasks.add_task(
        run_render,
        job_id,
        request.render_id,
        request.audio_url,
        request.segments,
        request.template_json,
        request.user_id,
        request.supabase_storage_bucket
    )

    return {"job_id": job_id, "status": "queued"}

async def run_render(
    job_id: str,
    render_id: str,
    audio_url: str,
    segments: list,
    template_json: dict,
    user_id: str,
    storage_bucket: str
):
    try:
        render_jobs[job_id]["status"] = "processing"
        render_jobs[job_id]["progress"] = 10

        output_url = await assemble_video(
            render_id=render_id,
            audio_url=audio_url,
            segments=segments,
            template_json=template_json,
            user_id=user_id,
            progress_callback=lambda p: render_jobs[job_id].update({"progress": p})
        )

        render_jobs[job_id] = {
            "status": "complete",
            "progress": 100,
            "output_url": output_url,
            "error": None
        }
    except Exception as e:
        render_jobs[job_id] = {
            "status": "failed",
            "progress": 0,
            "output_url": None,
            "error": str(e)
        }

@app.get("/render/status/{job_id}")
async def get_render_status(
    job_id: str,
    authorization: Optional[str] = Header(None)
):
    verify_token(authorization)
    job = render_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
