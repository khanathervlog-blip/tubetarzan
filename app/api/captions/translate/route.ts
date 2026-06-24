import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { words, targetLanguage = "English" } = await request.json();
  if (!words || !Array.isArray(words)) return NextResponse.json({ error: "words array required" }, { status: 400 });

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const originalText = words.map((w: { word: string }) => w.word).join(" ");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Translate the following text to ${targetLanguage}. Return ONLY the translation, preserving natural sentence flow. Keep the same number of words as closely as possible.`,
      },
      { role: "user", content: originalText },
    ],
    max_tokens: 2000,
    temperature: 0.3,
  });

  const translated = completion.choices[0].message.content?.trim() || "";
  const translatedWords = translated.split(/\s+/);

  // Map translated words back onto original timestamps
  const translatedWithTimestamps = words.map((w: { word: string; start: number; end: number }, i: number) => ({
    word: translatedWords[i] || w.word,
    start: w.start,
    end: w.end,
  }));

  return NextResponse.json({ words: translatedWithTimestamps, translated });
}
