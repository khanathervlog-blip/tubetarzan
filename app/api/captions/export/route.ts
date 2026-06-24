import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function wordsToSrt(words: { word: string; start: number; end: number }[]): string {
  const lines: string[] = [];
  const chunk = 10;
  for (let i = 0; i < words.length; i += chunk) {
    const group = words.slice(i, i + chunk);
    const idx = i / chunk + 1;
    const toTime = (s: number) => {
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      const ms = Math.round((sec % 1) * 1000);
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(Math.floor(sec)).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
    };
    lines.push(`${idx}\n${toTime(group[0].start)} --> ${toTime(group[group.length - 1].end)}\n${group.map((w) => w.word).join(" ")}\n`);
  }
  return lines.join("\n");
}

function wordsToVtt(words: { word: string; start: number; end: number }[]): string {
  const srt = wordsToSrt(words);
  return "WEBVTT\n\n" + srt.replace(/,(\d{3})/g, ".$1").replace(/^\d+\n/gm, "");
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { words, format = "srt" } = await request.json();
  if (!words || !Array.isArray(words)) return NextResponse.json({ error: "words array required" }, { status: 400 });

  let content = "";
  let contentType = "text/plain";
  let filename = "captions.srt";

  if (format === "srt") {
    content = wordsToSrt(words);
    contentType = "text/srt";
    filename = "captions.srt";
  } else if (format === "vtt") {
    content = wordsToVtt(words);
    contentType = "text/vtt";
    filename = "captions.vtt";
  } else {
    return NextResponse.json({ error: "format must be srt or vtt" }, { status: 400 });
  }

  return new Response(content, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
