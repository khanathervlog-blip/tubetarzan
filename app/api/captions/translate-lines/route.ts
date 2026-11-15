import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import { rateLimit, TOO_MANY } from "@/lib/rate-limit";

export const maxDuration = 60;

/** Translates caption lines into ONE target language, keeping the exact line count so timestamps stay aligned. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimit(`captions-tl:${user.id}`, 60, 10 * 60_000)) return NextResponse.json(TOO_MANY, { status: 429 });

  // COST: calls OpenAI - paid plans / admin only
  const { data: profileRaw } = await supabase.from("profiles").select("subscription_plan, email").eq("id", user.id).single();
  const profile = profileRaw as { subscription_plan: string; email: string } | null;
  const isAdmin = (process.env.ADMIN_EMAIL || "").split(",").map((e) => e.trim()).includes(profile?.email || user.email || "");
  if ((profile?.subscription_plan || "free") === "free" && !isAdmin) {
    return NextResponse.json({ error: "Translating captions into many languages needs the Creator plan or above.", upgradeRequired: true }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const lines: unknown = body.lines;
  const target = String(body.targetLanguage || "").slice(0, 40);
  const source = String(body.sourceLanguage || "Hindi").slice(0, 40);
  if (!target || !Array.isArray(lines) || lines.length === 0 || lines.length > 400 || lines.some((l) => typeof l !== "string" || l.length > 300)) {
    return NextResponse.json({ error: "lines (max 400) and targetLanguage required" }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 12000,
      messages: [
        {
          role: "system",
          content: `You translate video subtitles from ${source} to ${target}. The input is a JSON object {"lines":[...]}. Return a JSON object {"lines":[...]} with EXACTLY the same number of items, in the same order, each item the natural, accurate ${target} translation of the matching input line (keep it short, subtitle style). Never merge, split, skip or add lines.`,
        },
        { role: "user", content: JSON.stringify({ lines }) },
      ],
    });
    const parsed = JSON.parse(completion.choices[0].message.content || "{}") as { lines?: unknown };
    const out = Array.isArray(parsed.lines) ? parsed.lines.map((x) => String(x ?? "")) : [];
    if (out.length !== lines.length) return NextResponse.json({ error: "Translation came back misaligned, please retry." }, { status: 502 });
    return NextResponse.json({ lines: out });
  } catch (e) {
    console.error("translate-lines failed:", e);
    return NextResponse.json({ error: "Translation failed, please retry." }, { status: 502 });
  }
}
