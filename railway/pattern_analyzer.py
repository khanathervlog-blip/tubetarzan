"""
Pattern Analyzer
Downloads a YouTube video at lowest quality, detects scene cuts,
classifies segments with GPT-4o-mini, and returns a reusable template.

Dependencies: yt-dlp, scenedetect, openai
Install with: pip install -r requirements.txt
"""

import os
import json
import tempfile
import asyncio
from pathlib import Path
from typing import Callable, Optional
import httpx
from openai import AsyncOpenAI

openai_client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


async def analyze_video_pattern(youtube_url: str, video_id: str) -> dict:
    """
    Downloads video, detects scene cuts, classifies segments with AI.
    Returns a pattern dict compatible with the editing_patterns table.
    """

    with tempfile.TemporaryDirectory() as tmpdir:
        video_path = Path(tmpdir) / f"{video_id}.mp4"

        # ── 1. Download lowest-quality video with yt-dlp ──────────────────
        try:
            import yt_dlp

            ydl_opts = {
                "format": "worstvideo[ext=mp4]+worstaudio/worst[ext=mp4]/worst",
                "outtmpl": str(video_path),
                "quiet": True,
                "no_warnings": True,
                "max_filesize": 100 * 1024 * 1024,  # 100MB cap
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(youtube_url, download=True)
                title = info.get("title", "Unknown")
                duration = info.get("duration", 0)
        except Exception as e:
            raise RuntimeError(f"Failed to download video: {e}")

        if not video_path.exists():
            raise RuntimeError("Video download failed — file not created")

        # ── 2. Detect scene cuts with PySceneDetect ───────────────────────
        try:
            from scenedetect import open_video, SceneManager
            from scenedetect.detectors import ContentDetector

            video = open_video(str(video_path))
            scene_manager = SceneManager()
            scene_manager.add_detector(ContentDetector(threshold=27.0))
            scene_manager.detect_scenes(video, show_progress=False)
            scenes = scene_manager.get_scene_list()
        except Exception as e:
            # Fallback: create basic segments based on duration
            scenes = []

        # ── 3. Build segment list ─────────────────────────────────────────
        segments = []
        if scenes:
            for i, (start, end) in enumerate(scenes):
                seg_duration = (end - start).get_seconds()
                segments.append({
                    "index": i,
                    "start_seconds": start.get_seconds(),
                    "end_seconds": end.get_seconds(),
                    "duration_seconds": round(seg_duration, 2),
                    "type": "unknown",
                })
        else:
            # Fallback: split into 30-second chunks
            chunks = max(1, int(duration // 30))
            for i in range(chunks):
                start = i * 30
                end = min((i + 1) * 30, duration)
                segments.append({
                    "index": i,
                    "start_seconds": start,
                    "end_seconds": end,
                    "duration_seconds": round(end - start, 2),
                    "type": "unknown",
                })

        # ── 4. Classify segments with GPT-4o-mini ─────────────────────────
        segment_summary = "\n".join([
            f"Segment {s['index'] + 1}: {s['start_seconds']:.0f}s - {s['end_seconds']:.0f}s ({s['duration_seconds']:.0f}s)"
            for s in segments[:20]  # Cap at 20 segments for API cost
        ])

        classification_response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.3,
            max_tokens=800,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": """You are a video editing expert. You're given scene cut timestamps from a YouTube video.
Classify each segment as one of:
- "hook" (0-60s opening that grabs attention)
- "intro" (channel intro, title card)
- "presenter" (talking head, person speaking)
- "broll" (cutaway footage, screen recording)
- "text_overlay" (text or graphics on screen)
- "transition" (short cut <3s)
- "outro" (end screen, CTA, subscribe card)

Return JSON: {"segments": [{"index": 0, "type": "hook", "reason": "short intro section"}], "pattern_summary": "string", "cut_frequency_per_minute": number, "has_broll": boolean}"""
                },
                {
                    "role": "user",
                    "content": f"Video: {title}\nDuration: {duration}s\n\nSegments:\n{segment_summary}"
                }
            ]
        )

        try:
            ai_result = json.loads(classification_response.choices[0].message.content)
        except Exception:
            ai_result = {"segments": [], "pattern_summary": "Analysis unavailable", "cut_frequency_per_minute": 0, "has_broll": False}

        # ── 5. Merge AI classifications back into segments ─────────────────
        ai_segs = {s["index"]: s for s in ai_result.get("segments", [])}
        for seg in segments:
            ai_data = ai_segs.get(seg["index"], {})
            seg["type"] = ai_data.get("type", "presenter")
            seg["reason"] = ai_data.get("reason", "")

        avg_clip = sum(s["duration_seconds"] for s in segments) / max(len(segments), 1)
        cut_freq = ai_result.get("cut_frequency_per_minute") or (len(segments) / (duration / 60) if duration > 0 else 0)

        # ── 6. Build reusable template ────────────────────────────────────
        template = {
            "version": "1.0",
            "total_duration_hint": duration,
            "avg_clip_duration": round(avg_clip, 1),
            "cut_frequency_per_minute": round(cut_freq, 1),
            "segment_pattern": [s["type"] for s in segments[:15]],
            "segments": segments,
        }

        return {
            "video_id": video_id,
            "video_title": title,
            "total_clips": len(segments),
            "avg_clip_duration_seconds": round(avg_clip, 2),
            "cut_frequency_per_minute": round(cut_freq, 2),
            "has_broll": ai_result.get("has_broll", False),
            "pattern_summary": ai_result.get("pattern_summary", ""),
            "pattern_segments": segments,
            "template_json": template,
        }
