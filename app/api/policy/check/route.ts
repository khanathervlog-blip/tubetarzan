import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, description, scriptExcerpt } = await request.json();

  if (!title && !description && !scriptExcerpt) {
    return NextResponse.json({ error: "At least one content field required" }, { status: 400 });
  }

  const contentParts: string[] = [];
  if (title) contentParts.push(`Title: ${title}`);
  if (description) contentParts.push(`Description: ${description}`);
  if (scriptExcerpt)
    contentParts.push(`Script excerpt (first 2,000 chars): ${scriptExcerpt.slice(0, 2000)}`);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a YouTube policy compliance expert. Analyze the provided content against YouTube's Community Guidelines and Advertiser-Friendly Content Guidelines (2025 update).

Check for these issues:
1. Misleading clickbait (title doesn't match content)
2. Medical or health misinformation
3. Violence or graphic content language
4. Copyright risks (song lyrics, extensive quotes from protected works)
5. Age-restricted content triggers
6. Advertiser-unfriendly topics or language
7. Repetitive or clearly AI-generated template content signals
8. Synthetic media disclosure needs

Return only valid JSON with this exact shape:
{
  "overallRisk": "safe" | "caution" | "risk" | "blocked",
  "passed": boolean,
  "advertiserScore": number (0-100),
  "issues": [
    {
      "type": string,
      "severity": "low" | "medium" | "high",
      "description": string,
      "recommendation": string
    }
  ],
  "summary": string (1-2 sentences overall verdict)
}`,
        },
        {
          role: "user",
          content: contentParts.join("\n\n"),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      throw new Error("Failed to parse policy check response");
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Policy check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
