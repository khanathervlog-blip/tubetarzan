# TubeTarzan Lip Sync on LatentSync (better quality than Wav2Lip)

LatentSync (ByteDance, Apache-2.0 - fine for commercial use) is a diffusion-based lip-sync model: much sharper
and more natural mouths than Wav2Lip. It is heavy, so TubeTarzan sends it clips of about 9 seconds.

You do NOT upload many files. You duplicate a public Space that already works on ZeroGPU, then replace one file.

## 1. Duplicate the working Space

1. Open https://huggingface.co/spaces/fffiloni/LatentSync
2. Top-right three dots -> **Duplicate this Space**.
3. Owner: `tubetarzan`, name e.g. `lip-sync-latentsync`, visibility **Public**, hardware **ZeroGPU**. Duplicate.
4. Wait until it builds (first build installs everything and can take 10-15 minutes).

## 2. Replace app.py

In your duplicate: Files -> `app.py` -> Edit -> delete everything and paste the contents of
`hf-space-latentsync/app.py` from the TubeTarzan repo -> Commit.

Optional but recommended: Settings -> Variables -> `ALLOWED_UPLOAD_PREFIX` = your Supabase URL
(e.g. `https://abcd1234.supabase.co/`).

## 3. Point TubeTarzan at it

Vercel -> Settings -> Environment Variables -> change `HF_LIPSYNC_SPACE_URL` to `tubetarzan/lip-sync-latentsync`
-> redeploy. `HF_TOKENS` stays the same.

## Quota reality check

LatentSync reserves up to ~180 GPU-seconds for a ~10 s clip. A free Hugging Face account has only a few minutes
of ZeroGPU per day, so expect roughly one clip per account per day (TubeTarzan's daily budget counter assumes
15 s of video per key; tune with the `LIPSYNC_DAILY_SECONDS_PER_KEY` Vercel env var after the first real runs
show the actual "took" time). A Hugging Face PRO account (about $9/month) has 8x the ZeroGPU quota.
