---
title: TubeTarzan Lip Sync
emoji: 🗣️
colorFrom: yellow
colorTo: red
sdk: gradio
python_version: "3.10"
app_file: app.py
pinned: false
---

# TubeTarzan Lip Sync worker (Hugging Face ZeroGPU)

This folder is a complete Hugging Face Space. TubeTarzan sends it one clip at a time (60 s max); it
lip-syncs the clip on a free ZeroGPU and uploads the MP4 straight back to Supabase Storage.

## 1. Create the Space (one account hosts it)

1. Sign in to the Hugging Face account that will **host** the Space.
2. New Space → name e.g. `tubetarzan-lipsync` → SDK **Gradio** → hardware **ZeroGPU** → visibility **Public**
   (the other accounts' keys can't call a private Space; nothing secret lives in it).
3. Upload the four files in this folder (`README.md`, `app.py`, `requirements.txt`, `packages.txt`).
4. Optional, recommended: Space → Settings → Variables → `ALLOWED_UPLOAD_PREFIX` = your Supabase URL
   (e.g. `https://abcd1234.supabase.co/`) so the worker only uploads to your storage.
5. Wait for "Running". The first start downloads the model (~450 MB).

## 2. Connect TubeTarzan (Vercel → Project → Settings → Environment Variables)

| Variable | Value |
| --- | --- |
| `HF_LIPSYNC_SPACE_URL` | `your-username/tubetarzan-lipsync` |
| `HF_TOKENS` | the "read" access tokens of your 10 accounts, comma-separated: `hf_aaa,hf_bbb,...` |
| `NEXT_PUBLIC_LIPSYNC_PAID` | leave **unset** until you use a commercially licensed engine (see below); then `true` |

Never paste the tokens anywhere else. Each account's daily ZeroGPU quota is used in turn; when one runs out,
TubeTarzan moves to the next and pauses the job when all are used up.

## 3. Test

Admin → Lip Sync shows the key pool and lets you run a 30-second test from Dashboard → Lip Sync Studio.
Check the "took" time of the first clips to see the real GPU time per clip.

## Licence - read before selling Lip Sync

`app.py` uses **Wav2Lip**. Its official weights are licensed for **personal / research / non-commercial use
only**. Use this engine for testing and your own trials. Before customers pay for Lip Sync, replace the
engine with one licensed for commercial use, e.g. **MuseTalk** (code and models under MIT), keeping the
same `/run_lipsync(video_url, audio_url, upload_url)` API so TubeTarzan doesn't need to change. Then set
`NEXT_PUBLIC_LIPSYNC_PAID=true` in Vercel, which shows the Lip Sync minutes on the pricing page and lets
paid plans use them.
