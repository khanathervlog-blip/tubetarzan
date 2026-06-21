import OpenAI from "openai";
import { scoreTitle } from "./scoring";
import type { EnrichedVideo, GeneratedIdea } from "@/types/youtube";

export async function generateVideoIdea(
  sourceVideo: EnrichedVideo,
  userNiche: string
): Promise<GeneratedIdea> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 1024,
    messages: [
      {
        role: "system",
        content: `You are a senior YouTube viral content strategist with 10 years experience helping faceless automation channels grow from 0 to 100,000 subscribers.

You specialise in the YouTube automation masterclass methodology:
- Niche selection and competitor reverse-engineering
- Video packaging: title → thumbnail text → hook → click confirmation
- VPH and outlier ratio analysis
- Writing curiosity-driven hooks with fear or excitement`,
      },
      {
        role: "user",
        content: `I run a YouTube channel in the "${userNiche}" niche targeting US/UK/Canada/Australia audiences.

Based on this top-performing competitor video:
Title: ${sourceVideo.title}
Channel: ${sourceVideo.channelName} (${sourceVideo.channelSubscriberCount.toLocaleString()} subs)
Views: ${sourceVideo.viewCount.toLocaleString()} | VPH: ${sourceVideo.vph} | Outlier: ${sourceVideo.outlierRatio}x
Tags: ${sourceVideo.tags.slice(0, 10).join(", ")}

Generate ONE original video idea for my channel.
Do NOT copy the source title — create a NEW angle inspired by the pattern.

Return ONLY a valid JSON object (no markdown, no preamble, no explanation) with these exact fields:
{
  "video_title": "string max 65 chars, power words, avoid 'How to' openers",
  "thumbnail_text": "2-4 words ALL CAPS",
  "hook_line": "first sentence — curiosity + fear or excitement",
  "click_confirmation": "one sentence after hook confirming what viewer gets",
  "sub_niche_keyword": "specific angle",
  "packaging_notes": "1-2 sentences on why title + thumbnail = high CTR",
  "suggested_tags": ["tag1", "tag2", "up to 15 tags"]
}

Use these proven viral patterns:
- "Things Not To Do In X"
- "Dark Side of X — Things They Won't Tell You"
- "Mistakes X Always Make"
- "Best Places/Things in X"
- "X vs X"
- "Is X Worth It?"
- "What $X Gets You In X"
- "First Impression of X"
- "Things You Will Only See In X"
- "Hidden Gems of X"`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content || "";
  const clean = text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  try {
    const idea = JSON.parse(clean) as GeneratedIdea;
    idea.title_score = scoreTitle(idea.video_title);
    return idea;
  } catch {
    console.error("OpenAI JSON parse error:", text);
    throw new Error("Failed to parse AI response");
  }
}
