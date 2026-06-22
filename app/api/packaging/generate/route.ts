import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import { scoreTitle } from "@/lib/scoring";
import type { Profile } from "@/types/database";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    type: "thumbnail" | "hooks" | "outline" | "policy" | "description" | "tags";
    title: string;
    thumbnailText?: string;
    topic?: string;
  };

  const { type, title, thumbnailText, topic } = body;
  if (!type || !title) return NextResponse.json({ error: "type and title required" }, { status: 400 });

  // Steps 5-6 (description + tags) require Creator plan or above
  if (type === "description" || type === "tags") {
    const { data: profileRaw } = await supabase.from("profiles").select("subscription_plan").eq("id", user.id).single();
    const plan = (profileRaw as Pick<Profile, "subscription_plan"> | null)?.subscription_plan || "free";
    const isAdmin = (process.env.ADMIN_EMAIL || "").split(",").map(e => e.trim()).includes(user.email || "");
    if (plan === "free" && !isAdmin) {
      return NextResponse.json({
        error: "Description and Tags generation requires Creator plan or above.",
        upgradeRequired: true,
        plan: "free",
      }, { status: 403 });
    }
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    if (type === "thumbnail") {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 512,
        messages: [
          { role: "system", content: "You are a YouTube thumbnail text expert. Return only valid JSON." },
          {
            role: "user",
            content: `Generate 5 thumbnail text options for this YouTube video title: "${title}"

Each option should be 2-4 words in ALL CAPS that creates curiosity and pairs powerfully with the title.

Return ONLY valid JSON:
{
  "options": [
    { "text": "THEY LIED", "score": 92, "why": "Creates maximum curiosity and betrayal angle" },
    { "text": "TOURIST TRAPS", "score": 87, "why": "Direct match to video topic" },
    { "text": "AVOID THESE", "score": 85, "why": "Warning angle drives clicks" },
    { "text": "WORST MISTAKES", "score": 89, "why": "Loss aversion trigger" },
    { "text": "DON'T DO THIS", "score": 91, "why": "Pattern interrupt + urgency" }
  ]
}`,
          },
        ],
      });
      const text = response.choices[0]?.message?.content || "";
      const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      return NextResponse.json(JSON.parse(clean));
    }

    if (type === "hooks") {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 1024,
        messages: [
          { role: "system", content: "You are a YouTube script hook writer. Return only valid JSON." },
          {
            role: "user",
            content: `Write 5 powerful hook lines for this YouTube video:
Title: "${title}"
Thumbnail text: "${thumbnailText || ""}"
Topic: "${topic || title}"

Each hook is the first sentence of the script. It must hook the viewer in under 5 seconds.
Use different types: curiosity, personal loss, authority, conspiracy, pattern interrupt.

Return ONLY valid JSON:
{
  "hooks": [
    { "text": "hook sentence here...", "type": "Curiosity/Conspiracy", "strength": 5 },
    { "text": "hook sentence here...", "type": "Personal loss + Empathy", "strength": 5 },
    { "text": "hook sentence here...", "type": "Authority + Promise", "strength": 4 },
    { "text": "hook sentence here...", "type": "Conspiracy + Money", "strength": 4 },
    { "text": "hook sentence here...", "type": "Pattern interrupt", "strength": 5 }
  ],
  "click_confirmation": "One sentence after hook confirming what viewer will get"
}`,
          },
        ],
      });
      const text = response.choices[0]?.message?.content || "";
      const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      return NextResponse.json(JSON.parse(clean));
    }

    if (type === "outline") {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 1024,
        messages: [
          { role: "system", content: "You are a YouTube scriptwriting expert. Return only valid JSON." },
          {
            role: "user",
            content: `Generate a script outline for this YouTube video:
Title: "${title}"
Thumbnail text: "${thumbnailText || ""}"
Topic: "${topic || title}"

Return ONLY valid JSON:
{
  "outline": [
    { "section": "INTRO", "time": "0:00 - 0:45", "points": ["Hook line", "Click confirmation", "Brief credibility"] },
    { "section": "SECTION 1", "time": "0:45 - 2:30", "points": ["Main point 1", "Supporting detail", "Example"] },
    { "section": "SECTION 2", "time": "2:30 - 5:00", "points": ["Main point 2", "Supporting detail", "Example"] },
    { "section": "SECTION 3", "time": "5:00 - 7:30", "points": ["Main point 3", "Supporting detail", "Example"] },
    { "section": "OUTRO", "time": "7:30 - 8:30", "points": ["Recap key points", "CTA: Subscribe + Comment", "End screen suggestion"] }
  ],
  "estimated_duration": "8-10 minutes",
  "click_confirmation": "One-sentence promise after the hook"
}`,
          },
        ],
      });
      const text = response.choices[0]?.message?.content || "";
      const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      return NextResponse.json(JSON.parse(clean));
    }

    if (type === "policy") {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 512,
        messages: [
          { role: "system", content: "You are a YouTube content policy expert. Return only valid JSON." },
          {
            role: "user",
            content: `Check this YouTube video title and topic for potential policy issues:
Title: "${title}"
Topic: "${topic || title}"

Check for: misleading clickbait, harmful advice, medical misinformation, hate speech, NSFW content, dangerous stunts.

Return ONLY valid JSON:
{
  "status": "clear" | "warning" | "risk",
  "checks": [
    { "pass": true, "text": "Title appears policy-compliant" },
    { "pass": true, "text": "Topic does not appear to violate guidelines" },
    { "pass": false, "text": "Warning: consider alternative wording for X" }
  ],
  "summary": "Brief overall assessment"
}`,
          },
        ],
      });
      const text = response.choices[0]?.message?.content || "";
      const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      return NextResponse.json(JSON.parse(clean));
    }

    if (type === "description") {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 800,
        messages: [
          { role: "system", content: "You are a YouTube SEO expert. Return only valid JSON." },
          {
            role: "user",
            content: `Write an SEO-optimized YouTube video description for:
Title: "${title}"
Topic: "${topic || title}"

The description should:
- Start with a strong 2-3 sentence hook summarizing the video value
- Include natural keyword placement (not stuffed)
- Have timestamps placeholder section
- Include a CTA to subscribe
- End with 3-5 relevant hashtags
- Be 200-350 words total

Return ONLY valid JSON:
{
  "description": "full description text here...",
  "hashtags": ["#tag1", "#tag2", "#tag3"],
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}`,
          },
        ],
      });
      const text = response.choices[0]?.message?.content || "";
      const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      return NextResponse.json(JSON.parse(clean));
    }

    if (type === "tags") {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 600,
        messages: [
          { role: "system", content: "You are a YouTube SEO tag expert. Return only valid JSON." },
          {
            role: "user",
            content: `Generate 30 optimized YouTube tags for this video:
Title: "${title}"
Topic: "${topic || title}"

Rules:
- Mix of exact match, broad, and long-tail tags
- Include the main topic, related topics, and question-based tags
- Each tag under 30 characters where possible
- Order by search volume (highest first)

Return ONLY valid JSON:
{
  "tags": ["tag1", "tag2", "tag3", "...up to 30 tags"],
  "primary_tags": ["top 5 most important tags"],
  "tip": "one sentence tip about these tags"
}`,
          },
        ],
      });
      const text = response.choices[0]?.message?.content || "";
      const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      return NextResponse.json(JSON.parse(clean));
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (err) {
    console.error("Packaging generate error:", err);
    return NextResponse.json({ error: "AI generation failed. Please try again." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "";
  return NextResponse.json({ score: scoreTitle(title), title });
}
