import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { niche } = await request.json() as { niche?: string };
  if (!niche?.trim()) return NextResponse.json({ error: "niche is required" }, { status: 400 });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a YouTube monetization expert with deep knowledge of ad rates across niches.
Estimate realistic RPM and CPM values for YouTube niches based on advertiser demand, audience demographics, and industry data.
Return ONLY valid JSON — no markdown, no extra text.`,
        },
        {
          role: "user",
          content: `Estimate the YouTube monetization data for the niche: "${niche.trim()}"

Return this exact JSON structure:
{
  "niche": "Cleaned/proper name of the niche",
  "category": "Category it belongs to (e.g. Sports, Health, Finance, Entertainment, Technology, etc.)",
  "rpm": <number: estimated USD revenue per 1000 views, e.g. 4.5>,
  "cpm": <number: estimated advertiser CPM in USD, always higher than rpm, e.g. 7.0>,
  "competition": "low" | "medium" | "high",
  "difficulty": "easy" | "medium" | "hard",
  "country": "US",
  "insight": "1-2 sentence explanation of why the RPM is this level and who advertises in this niche"
}

Base your estimates on real YouTube ad market data. Finance/business = high RPM ($8-20), tech = medium-high ($6-18), entertainment/gaming = low-medium ($2-8), sports = medium ($4-10).`,
        },
      ],
    });

    const raw = completion.choices[0].message.content || "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const result = JSON.parse(clean);

    return NextResponse.json({ niche: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lookup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
