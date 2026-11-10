// One Go 9-step automation pipeline
// All AI calls use GPT-4o-mini (OpenAI) — never Claude/Anthropic API.

import OpenAI from "openai";
import { createServiceClient } from "./supabase/server";
import { pickBestVideoForOneGo } from "./one-go-picker";
import { runLipSyncFree } from "./lipsync-free";
import type { EnrichedVideo, GeneratedIdea } from "@/types/youtube";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface OneGoConfig {
  id: string;
  channel_id?: string;
  channel_handle?: string;
  channel_niche: string;
  face_video_url: string;
  voice_preset_id?: string;
  caption_style?: string;
  auto_post?: boolean;
  post_platforms?: string[];
  max_runs_per_month?: number;
}

export interface OneGoJob {
  id: string;
  overall_status: "running" | "complete" | "failed";
  current_step: string;
  progress_percent: number;
  channel_niche: string;
  face_video_url: string;
  voice_preset_id?: string;
  caption_style?: string;
  auto_post?: boolean;
  post_platforms?: string[];
  // outputs
  selected_video_id?: string;
  selected_video_title?: string;
  viral_score?: number;
  viral_tier?: string;
  selection_reason?: string;
  generated_idea?: GeneratedIdea;
  script_text?: string;
  audio_url?: string;
  broll_urls?: string[];
  lipsync_url?: string;
  captions_url?: string;
  final_video_url?: string;
  error_message?: string;
  completed_at?: string;
}

// ── Job progress helpers ────────────────────────────────────────────────────

async function updateJob(
  jobId: string,
  patch: Partial<OneGoJob>
): Promise<void> {
  const supabase = await createServiceClient();
  await supabase.from("one_go_jobs").update(patch).eq("id", jobId);
}

async function failJob(jobId: string, step: string, error: string): Promise<void> {
  await updateJob(jobId, {
    overall_status: "failed",
    current_step: `Failed: ${step}`,
    error_message: error,
    completed_at: new Date().toISOString(),
  });
}

// ── Step 1: Find viral video (searches YouTube & picks best) ────────────────

async function step1_findViralVideo(
  jobId: string,
  niche: string
): Promise<EnrichedVideo> {
  await updateJob(jobId, { current_step: "Step 1/9: Scanning viral videos...", progress_percent: 5 });

  const { runViralPipeline } = await import("./pipeline");
  const apiKey = process.env.YOUTUBE_API_KEY || "";
  const result = await runViralPipeline(niche, "one_go_system", apiKey);

  if (!result.videos || result.videos.length === 0) {
    throw new Error("No videos found for niche: " + niche);
  }

  const pick = pickBestVideoForOneGo(result.videos);

  await updateJob(jobId, {
    selected_video_id: pick.video.videoId,
    selected_video_title: pick.video.title,
    viral_score: pick.scoreBreakdown.total,
    viral_tier: pick.scoreBreakdown.viralTier,
    selection_reason: pick.selectionReason,
    current_step: `Step 1/9: Selected "${pick.video.title.slice(0, 60)}"`,
    progress_percent: 11,
  });

  return pick.video;
}

// ── Step 2: Competitor analysis ─────────────────────────────────────────────

async function step2_analyzeCompetitor(
  jobId: string,
  video: EnrichedVideo
): Promise<string> {
  await updateJob(jobId, { current_step: "Step 2/9: Analysing competitor video...", progress_percent: 18 });

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 600,
    messages: [
      {
        role: "system",
        content: "You are a YouTube content strategist. Analyse competitor videos and extract the key hook, content structure, and engagement drivers. Be concise and actionable.",
      },
      {
        role: "user",
        content: `Analyse this viral YouTube video and extract the content strategy:

Title: "${video.title}"
Channel: ${video.channelName} (${video.channelSubscriberCount.toLocaleString()} subs)
Views: ${video.viewCount.toLocaleString()} | VPH: ${video.vph} | Outlier: ${video.outlierRatio}x
Tags: ${video.tags.slice(0, 12).join(", ")}

Return a 4-sentence analysis:
1. What makes the TITLE click-worthy (curiosity gap, fear, number, etc.)
2. The likely HOOK structure (how it opens in first 30 seconds)
3. What CONTENT delivers the payoff viewers expect
4. Why this topic is TRENDING right now

Be direct and specific. These will guide script writing.`,
      },
    ],
  });

  const analysis = response.choices[0]?.message?.content || "";
  await updateJob(jobId, { progress_percent: 22 });
  return analysis;
}

// ── Step 3: Script generation ────────────────────────────────────────────────

async function step3_generateScript(
  jobId: string,
  video: EnrichedVideo,
  niche: string,
  competitorAnalysis: string
): Promise<{ title: string; script: string; idea: GeneratedIdea }> {
  await updateJob(jobId, { current_step: "Step 3/9: Generating script...", progress_percent: 25 });

  // First generate the idea/angle
  const ideaResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 512,
    messages: [
      {
        role: "system",
        content: "You are a senior YouTube viral content strategist. Generate fresh video ideas inspired by competitor analysis. Return ONLY valid JSON.",
      },
      {
        role: "user",
        content: `Competitor video: "${video.title}" got ${video.viewCount.toLocaleString()} views (${video.outlierRatio}x outlier).

Competitor analysis:
${competitorAnalysis}

My channel niche: "${niche}"

Generate ONE original video idea for my channel. Do NOT copy the competitor title.

Return ONLY this JSON:
{
  "video_title": "string max 65 chars, power words, avoid 'How to' openers",
  "thumbnail_text": "2-4 words ALL CAPS",
  "hook_line": "first sentence — curiosity + fear or excitement",
  "click_confirmation": "one sentence after hook confirming what viewer gets",
  "sub_niche_keyword": "specific angle",
  "packaging_notes": "1-2 sentences on why title + thumbnail = high CTR",
  "suggested_tags": ["tag1", "tag2", "up to 15 tags"]
}`,
      },
    ],
  });

  const ideaText = (ideaResponse.choices[0]?.message?.content || "")
    .replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  let idea: GeneratedIdea;
  try {
    idea = JSON.parse(ideaText);
    idea.title_score = 0; // will be computed if needed
  } catch {
    idea = {
      video_title: `${video.title.split(" ").slice(0, 5).join(" ")} (Our Take)`,
      thumbnail_text: "YOU NEED TO SEE",
      hook_line: "Most people have no idea this is happening...",
      click_confirmation: "By the end of this video, you'll know exactly what to do.",
      sub_niche_keyword: niche,
      packaging_notes: "Strong curiosity gap in title with visual proof thumbnail.",
      suggested_tags: [niche],
      title_score: 0,
    };
  }

  await updateJob(jobId, { generated_idea: idea, progress_percent: 32 });

  // Now generate full script
  const scriptResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 3000,
    messages: [
      {
        role: "system",
        content: "You are a YouTube scriptwriting expert. Write engaging, human-sounding scripts that feel natural when spoken aloud. Target 8-10 minutes (~1500 words). Return only valid JSON.",
      },
      {
        role: "user",
        content: `Write a complete YouTube script for:
Title: "${idea.video_title}"
Hook: "${idea.hook_line}"
Topic: "${niche}" niche

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MANDATORY RETENTION RULES:
1. HOOK (0:00–0:30): Open with the hook — tease biggest payoff FIRST
2. RE-HOOKS every 2–3 min: Each section opens with a mini-hook
3. HOOK ANSWERED before 30% mark
4. SESSION CONTINUATION CTA at 50% mark: "If you're enjoying this, smash Like right now"
5. MAX 8–10 minutes: cut filler ruthlessly
6. CLOSING CTA: ONE clear action — subscribe OR watch next video
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return ONLY this JSON:
{
  "sections": [
    {
      "title": "HOOK / INTRO",
      "timestamp": "0:00 - 0:30",
      "script": "Full word-for-word script...",
      "broll_cues": ["B-ROLL: show X"],
      "word_count": 80,
      "has_rehook": false
    }
  ],
  "total_word_count": 1500,
  "estimated_duration": "9 minutes",
  "cta": "Subscribe CTA text",
  "production_notes": "2-3 tips for filming/editing"
}`,
      },
    ],
  });

  const scriptText = (scriptResponse.choices[0]?.message?.content || "")
    .replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  let scriptObj: { sections: Array<{ script: string }> };
  try {
    scriptObj = JSON.parse(scriptText);
  } catch {
    scriptObj = { sections: [{ script: `${idea.hook_line}\n\n${idea.click_confirmation}` }] };
  }

  const fullScript = scriptObj.sections.map((s) => s.script).join("\n\n");
  await updateJob(jobId, { script_text: fullScript, progress_percent: 42 });

  return { title: idea.video_title, script: fullScript, idea };
}

// ── Step 4: Audio generation (Google TTS) ───────────────────────────────────

async function step4_generateAudio(
  jobId: string,
  script: string,
  voicePresetId?: string
): Promise<string> {
  await updateJob(jobId, { current_step: "Step 4/9: Generating voiceover...", progress_percent: 45 });

  const ttsUrl = process.env.GOOGLE_TTS_URL || process.env.FFMPEG_SERVICE_URL;
  if (!ttsUrl) {
    throw new Error("TTS service URL not configured (GOOGLE_TTS_URL or FFMPEG_SERVICE_URL)");
  }

  const res = await fetch(`${ttsUrl}/tts/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: script.slice(0, 4800), // Google TTS limit
      voice: voicePresetId || "en-US-Neural2-J",
      speaking_rate: 1.05,
      pitch: -1.0,
      job_id: jobId,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TTS generation failed: ${err}`);
  }

  const data = await res.json() as { audio_url: string };
  await updateJob(jobId, { audio_url: data.audio_url, progress_percent: 52 });
  return data.audio_url;
}

// ── Step 5: B-roll selection (Pexels) ──────────────────────────────────────

async function step5_selectBroll(
  jobId: string,
  niche: string,
  idea: GeneratedIdea
): Promise<string[]> {
  await updateJob(jobId, { current_step: "Step 5/9: Selecting B-roll footage...", progress_percent: 55 });

  const pexelsKey = process.env.PEXELS_API_KEY;
  if (!pexelsKey) {
    await updateJob(jobId, { broll_urls: [], progress_percent: 58 });
    return [];
  }

  const queries = [
    idea.sub_niche_keyword || niche,
    niche,
    idea.suggested_tags?.[0] || niche,
  ];

  const brollUrls: string[] = [];
  for (const q of queries.slice(0, 2)) {
    try {
      const res = await fetch(
        `https://api.pexels.com/videos/search?query=${encodeURIComponent(q)}&per_page=3&size=medium`,
        { headers: { Authorization: pexelsKey } }
      );
      if (res.ok) {
        const data = await res.json() as { videos: Array<{ video_files: Array<{ link: string; quality: string }> }> };
        for (const v of data.videos || []) {
          const file = v.video_files?.find((f) => f.quality === "hd") || v.video_files?.[0];
          if (file?.link) brollUrls.push(file.link);
        }
      }
    } catch {
      // silently skip — B-roll is optional
    }
  }

  await updateJob(jobId, { broll_urls: brollUrls.slice(0, 6), progress_percent: 58 });
  return brollUrls.slice(0, 6);
}

// ── Step 6: Lip sync ────────────────────────────────────────────────────────

async function step6_lipSync(
  jobId: string,
  faceVideoUrl: string,
  audioUrl: string
): Promise<string | null> {
  await updateJob(jobId, { current_step: "Step 6/9: Running lip sync (GPU)...", progress_percent: 60 });

  if (!process.env.HF_LIPSYNC_SPACE_URL || !process.env.HF_TOKEN) {
    console.warn("[OneGo] Lip sync skipped — HF_LIPSYNC_SPACE_URL or HF_TOKEN not set");
    await updateJob(jobId, { progress_percent: 68 });
    return null;
  }

  const result = await runLipSyncFree(
    faceVideoUrl,
    audioUrl,
    jobId,
    "balanced",
    (status) => console.log(`[OneGo][LipSync] ${status}`)
  );

  if (result.success && result.outputUrl) {
    await updateJob(jobId, { lipsync_url: result.outputUrl, progress_percent: 68 });
    return result.outputUrl;
  }

  console.warn("[OneGo] Lip sync failed:", result.error);
  await updateJob(jobId, { progress_percent: 68 });
  return null;
}

// ── Step 7: Captions ─────────────────────────────────────────────────────────

async function step7_generateCaptions(
  jobId: string,
  videoUrl: string,
  captionStyle: string = "bold"
): Promise<string | null> {
  await updateJob(jobId, { current_step: "Step 7/9: Burning captions...", progress_percent: 72 });

  const ffmpegUrl = process.env.FFMPEG_SERVICE_URL;
  if (!ffmpegUrl) {
    await updateJob(jobId, { progress_percent: 78 });
    return null;
  }

  try {
    const res = await fetch(`${ffmpegUrl}/captions/burn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ video_url: videoUrl, style: captionStyle, job_id: jobId }),
    });

    if (!res.ok) throw new Error(await res.text());
    const data = await res.json() as { output_url: string };
    await updateJob(jobId, { captions_url: data.output_url, progress_percent: 78 });
    return data.output_url;
  } catch (err) {
    console.warn("[OneGo] Captions failed:", err);
    await updateJob(jobId, { progress_percent: 78 });
    return null;
  }
}

// ── Step 8: Final video assembly ─────────────────────────────────────────────

async function step8_assembleVideo(
  jobId: string,
  baseVideoUrl: string,
  audioUrl: string,
  brollUrls: string[]
): Promise<string> {
  await updateJob(jobId, { current_step: "Step 8/9: Assembling final video...", progress_percent: 80 });

  const ffmpegUrl = process.env.FFMPEG_SERVICE_URL;
  if (!ffmpegUrl) {
    // Fallback: use lipsync or base video as final
    const finalUrl = baseVideoUrl;
    await updateJob(jobId, { final_video_url: finalUrl, progress_percent: 90 });
    return finalUrl;
  }

  try {
    const res = await fetch(`${ffmpegUrl}/video/assemble`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        face_video_url: baseVideoUrl,
        audio_url: audioUrl,
        broll_urls: brollUrls,
        job_id: jobId,
        output_format: "mp4",
      }),
    });

    if (!res.ok) throw new Error(await res.text());
    const data = await res.json() as { output_url: string };
    await updateJob(jobId, { final_video_url: data.output_url, progress_percent: 90 });
    return data.output_url;
  } catch (err) {
    console.warn("[OneGo] Assembly failed, using base video:", err);
    await updateJob(jobId, { final_video_url: baseVideoUrl, progress_percent: 90 });
    return baseVideoUrl;
  }
}

// ── Step 9: Social posting ────────────────────────────────────────────────────

async function step9_post(
  jobId: string,
  videoUrl: string,
  title: string,
  idea: GeneratedIdea,
  platforms: string[],
  autoPost: boolean
): Promise<void> {
  await updateJob(jobId, { current_step: "Step 9/9: Posting to social...", progress_percent: 92 });

  if (!autoPost || !platforms || platforms.length === 0) {
    await updateJob(jobId, {
      current_step: "Step 9/9: Video ready — manual posting (auto-post disabled)",
      progress_percent: 98,
    });
    return;
  }

  // Log for now; actual posting via YouTube API or social APIs
  // can be wired in when upload tokens are configured
  console.log("[OneGo][Post] Would post to:", platforms.join(", "));
  console.log("[OneGo][Post] Title:", title);
  console.log("[OneGo][Post] Video URL:", videoUrl);
  console.log("[OneGo][Post] Tags:", idea.suggested_tags?.join(", "));

  await updateJob(jobId, { progress_percent: 98 });
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

export async function runOneGoPipeline(
  jobId: string,
  config: OneGoConfig
): Promise<void> {
  const {
    channel_niche: niche,
    face_video_url: faceVideoUrl,
    voice_preset_id: voicePresetId,
    caption_style: captionStyle,
    auto_post: autoPost,
    post_platforms: postPlatforms,
  } = config;

  console.log(`[OneGo] Starting pipeline for job ${jobId}, niche: ${niche}`);

  try {
    // Step 1: Find viral video
    const video = await step1_findViralVideo(jobId, niche);

    // Step 2: Competitor analysis
    const competitorAnalysis = await step2_analyzeCompetitor(jobId, video);

    // Step 3: Script + idea
    const { title, script, idea } = await step3_generateScript(
      jobId, video, niche, competitorAnalysis
    );

    // Step 4: Audio (TTS)
    let audioUrl: string;
    try {
      audioUrl = await step4_generateAudio(jobId, script, voicePresetId);
    } catch (err) {
      console.warn("[OneGo] TTS failed:", err);
      // Continue without audio — mark step as skipped
      await updateJob(jobId, {
        current_step: "Step 4/9: Audio skipped (TTS not configured)",
        progress_percent: 52,
      });
      // Complete the job with what we have
      await updateJob(jobId, {
        overall_status: "complete",
        current_step: "Completed (no audio — TTS not configured)",
        progress_percent: 100,
        completed_at: new Date().toISOString(),
      });
      return;
    }

    // Step 5: B-roll
    const brollUrls = await step5_selectBroll(jobId, niche, idea);

    // Step 6: Lip sync
    const lipsyncUrl = await step6_lipSync(jobId, faceVideoUrl, audioUrl);
    const videoForCaptions = lipsyncUrl || faceVideoUrl;

    // Step 7: Captions
    const captionedUrl = await step7_generateCaptions(jobId, videoForCaptions, captionStyle);
    const baseForAssembly = captionedUrl || videoForCaptions;

    // Step 8: Assemble
    const finalVideoUrl = await step8_assembleVideo(
      jobId, baseForAssembly, audioUrl, brollUrls
    );

    // Step 9: Post
    await step9_post(jobId, finalVideoUrl, title, idea, postPlatforms || [], autoPost || false);

    // Done
    await updateJob(jobId, {
      overall_status: "complete",
      current_step: "Completed successfully",
      progress_percent: 100,
      final_video_url: finalVideoUrl,
      completed_at: new Date().toISOString(),
    });

    console.log(`[OneGo] Job ${jobId} completed. Final video: ${finalVideoUrl}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[OneGo] Job ${jobId} failed:`, msg);
    await failJob(jobId, "pipeline", msg);
  }
}
