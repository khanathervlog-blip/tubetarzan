import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import type { Profile } from "@/types/database";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const FREE_DAILY_LIMIT = 2;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("subscription_plan")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as Pick<Profile, "subscription_plan"> | null;
  const plan = profile?.subscription_plan || "free";
  const isAdmin = (process.env.ADMIN_EMAIL || "").split(",").map(e => e.trim()).includes(user.email || "");

  // Free plan: limit to FREE_DAILY_LIMIT scripts per day
  if (plan === "free" && !isAdmin) {
    const today = new Date().toISOString().split("T")[0];
    const { count } = await supabase
      .from("viral_ideas")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("niche", "__script__")
      .gte("created_at", `${today}T00:00:00.000Z`);

    // Use admin_settings as a per-user counter via a workaround:
    // Track script usage in user metadata instead — simpler approach using localStorage on client
    // But we can track it server-side via a dedicated query
    // For simplicity, check viral_ideas with a sentinel niche tag
    if ((count || 0) >= FREE_DAILY_LIMIT) {
      return NextResponse.json({
        error: `Free plan allows ${FREE_DAILY_LIMIT} scripts per day. Upgrade to Creator for unlimited scripts.`,
        upgradeRequired: true,
        plan: "free",
      }, { status: 429 });
    }
  }

  const body = await request.json() as {
    title: string;
    hook: string;
    outline: string;
    topic: string;
    style: string;
    duration: string;
  };

  const { title, hook, outline, topic, style, duration } = body;
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  // Free plan: cap duration at 10min
  const effectiveDuration = (plan === "free" && !isAdmin && duration === "20min") ? "10min" : duration;
  const wordCount = effectiveDuration === "5min" ? 750 : effectiveDuration === "10min" ? 1500 : effectiveDuration === "15min" ? 2250 : 3000;

  const styleGuide = {
    educational: "authoritative but approachable — teach clearly with examples",
    tutorial: "step-by-step, clear and instructional — guide the viewer through each step",
    storytime: "narrative and personal — tell a story with vivid details and emotion",
    listicle: "punchy and direct — each point is its own mini-segment",
    commentary: "conversational and opinionated — share your genuine perspective",
  }[style] || "engaging and conversational";

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 3000,
      messages: [
        {
          role: "system",
          content: `You are a YouTube scriptwriting expert. Write engaging, human-sounding scripts that feel natural when spoken aloud. Style: ${styleGuide}. Target ~${wordCount} words. Return only valid JSON.`,
        },
        {
          role: "user",
          content: `Write a complete YouTube video script for:
Title: "${title}"
Topic: "${topic || title}"
Opening hook: "${hook || ""}"
Outline: "${outline || ""}"
Style: ${style}
Target duration: ${effectiveDuration}

The script must:
- Start with the exact hook provided (or create a powerful one if not given)
- Flow naturally — write as if SPEAKING, not writing
- Include [B-ROLL: description] cues where relevant
- Include [PAUSE] for dramatic effect where needed
- Include natural transitions between sections
- End with a strong CTA (subscribe, comment, watch next)
- Use contractions and casual language

Return ONLY this JSON structure:
{
  "sections": [
    {
      "title": "HOOK / INTRO",
      "timestamp": "0:00 - 0:30",
      "script": "Full word-for-word script for this section...",
      "broll_cues": ["B-ROLL: show X", "B-ROLL: cut to Y"],
      "word_count": 120
    }
  ],
  "total_word_count": 1500,
  "estimated_duration": "10 minutes",
  "cta": "Subscribe CTA text",
  "production_notes": "2-3 tips for filming/editing this video"
}`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content || "";
    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const result = JSON.parse(clean);
    return NextResponse.json({ ...result, plan });
  } catch (err) {
    console.error("Script generate error:", err);
    return NextResponse.json({ error: "Script generation failed. Please try again." }, { status: 500 });
  }
}
