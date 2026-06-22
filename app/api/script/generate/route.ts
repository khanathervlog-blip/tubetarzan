import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const wordCount = duration === "5min" ? 750 : duration === "10min" ? 1500 : duration === "15min" ? 2250 : 3000;

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
Target duration: ${duration}

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
    return NextResponse.json(JSON.parse(clean));
  } catch (err) {
    console.error("Script generate error:", err);
    return NextResponse.json({ error: "Script generation failed. Please try again." }, { status: 500 });
  }
}
