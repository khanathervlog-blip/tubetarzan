import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { verifyChannelOwnership } from "@/lib/channel-security";
import { scoreTitle } from "@/lib/scoring";
import OpenAI from "openai";
import type { ChannelVideoCache } from "@/types/database";

export async function POST(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as { channelId?: string };
  const { channelId } = body;
  if (!channelId) return NextResponse.json({ error: "channelId required" }, { status: 400 });

  if (!await verifyChannelOwnership(user.id, channelId)) {
    return NextResponse.json({ error: "Channel not authorized" }, { status: 403 });
  }

  const serviceSupabase = await createServiceClient();
  const { data: videoRaw } = await serviceSupabase
    .from("channel_video_cache")
    .select("*")
    .eq("user_id", user.id)
    .eq("channel_id", channelId)
    .eq("video_id", params.videoId)
    .single();

  const video = videoRaw as ChannelVideoCache | null;
  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

  const currentTitleScore = scoreTitle(video.title);
  const durationMin = Math.round((video.duration_seconds || 0) / 60);

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1500,
      messages: [
        {
          role: "system",
          content: `You are a world-class YouTube viral strategist. You craft titles, descriptions, and tags that dominate CTR and search rankings. You NEVER copy or rephrase existing content — you always create something fresh, provocative, and completely different. Return only valid JSON.`,
        },
        {
          role: "user",
          content: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CURRENT VIDEO (UNDERPERFORMING — score ${currentTitleScore}/100)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Title: "${video.title}"
Description (excerpt): ${(video.description || "(none)").slice(0, 300)}
Current tags: ${(video.tags || []).slice(0, 8).join(", ") || "(none)"}
Views: ${(video.view_count || 0).toLocaleString()} | VPH: ${video.vph} | Outlier: ${video.outlier_ratio}x
Duration: ${durationMin} minutes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  TITLE RULES — READ EVERY LINE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. DO NOT reuse, rephrase, or remix the current title. Ignore it completely.
2. Pick ONE of these proven viral formulas and apply it to the topic:
   • Formula A: [NUMBER] [POWER WORD] [Specific Outcome] + [(Bracket Hook)]
   • Formula B: [SHOCKING CLAIM] — [What Viewer Gains In Specific Terms]
   • Formula C: The [POWER WORD] [Topic] Nobody Talks About (#[year/number])
3. Strip emojis from character count. Bare title must be 40–65 characters.
4. Must include EXACTLY ONE power word (lower or UPPER case):
   shocking, insane, unbelievable, secret, truth, brutal, mistakes,
   never, hidden, exposed, only, nobody, ultimate, guaranteed, viral, epic
5. Must include at least one number (year, count, steps, %, time).
6. Include 1–2 ALL-CAPS words maximum (not the whole title).
7. Do NOT start with: "How to", "What is", "Learn", "Guide to", "Tips for".
8. Target score: 94–100/100. Score = 50 base + 15(length) + 15(power word) + 8(number) + 7(1-2 CAPS) + 5(question mark optional).

TITLE EXAMPLES — notice how different they are from a weak title:
✗ WEAK: "PASS Your G Driving Test on the FIRST TRY!"
✓ STRONG: "7 SHOCKING Mistakes That FAIL the G Driving Test"
✗ WEAK: "Learn How to Cook Perfect Rice"
✓ STRONG: "The ONLY Rice Secret Every Pakistani Chef Hides"
✗ WEAK: "Breathtaking Aerial Views of Niagara Falls Experience"
✓ STRONG: "INSANE 4K Niagara Falls Footage Nobody Has Filmed Before"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DESCRIPTION RULES (must score 85+/100):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Minimum 900 characters
• Line 1: powerful hook that creates urgency or curiosity
• Include primary keywords naturally in first 200 chars
• 3+ line breaks for readability
• Include "Subscribe" or "Follow" CTA
• End with 5–8 relevant hashtags (#keyword)
• Include at least one link placeholder: [LINK]
• Do NOT copy the existing description. Write fresh.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TAGS RULES (must score 94+/100):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Exactly 14 tags
• 4 single-word tags (broad reach)
• 10 multi-word long-tail tags (3–5 words each, specific search phrases)
• Every tag must be a real phrase people type into YouTube search
• Do NOT copy the current tags. Research fresh angles.
• Score per tag: single word = ~50pts, 2-word = ~72pts, 3-word = ~88pts, 4+ word = ~95pts

Return ONLY valid JSON (no markdown, no explanation outside JSON):
{
  "suggested_title": "EXACT new title — 40-65 bare chars, power word, number, 1-2 CAPS",
  "suggested_description": "900+ char fresh description with hook + keywords + CTA + hashtags",
  "suggested_tags": ["14 tags: 4 single-word + 10 multi-word long-tail"],
  "suggested_thumbnail_text": "3-5 ALL CAPS words for thumbnail overlay",
  "optimization_notes": "2-3 sentences explaining the specific viral strategy used and why these choices will increase CTR"
}`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content || "";
    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const suggestions = JSON.parse(clean) as {
      suggested_title: string;
      suggested_description: string;
      suggested_tags: string[];
      suggested_thumbnail_text: string;
      optimization_notes: string;
    };

    await serviceSupabase
      .from("channel_video_cache")
      .update({
        suggested_title: suggestions.suggested_title,
        suggested_description: suggestions.suggested_description,
        suggested_tags: suggestions.suggested_tags,
        suggested_thumbnail_text: suggestions.suggested_thumbnail_text,
        optimization_notes: suggestions.optimization_notes,
        suggestions_generated_at: new Date().toISOString(),
      } as Partial<ChannelVideoCache>)
      .eq("user_id", user.id)
      .eq("video_id", params.videoId);

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("Optimise error:", err);
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 });
  }
}
