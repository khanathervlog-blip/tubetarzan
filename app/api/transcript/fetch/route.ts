import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function extractVideoId(input: string): string | null {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = input.match(p);
    if (m) return m[1];
  }
  return null;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/<[^>]+>/g, "")
    .trim();
}

async function fetchTranscript(videoId: string) {
  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
    cache: "no-store",
  });

  if (!pageRes.ok) throw new Error("Failed to load YouTube page");
  const html = await pageRes.text();

  const split = html.split('"captions":');
  if (split.length < 2) {
    throw new Error(
      "No captions available for this video. The video may be private, unavailable, or have no subtitles."
    );
  }

  const captionsRaw = split[1].split(',"videoDetails')[0];
  let captionsData: {
    playerCaptionsTracklistRenderer: {
      captionTracks: { baseUrl: string; name: { simpleText: string }; languageCode: string }[];
    };
  };

  try {
    captionsData = JSON.parse(captionsRaw);
  } catch {
    throw new Error("Could not parse caption data from YouTube page");
  }

  const tracks = captionsData?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!tracks?.length) throw new Error("No caption tracks found for this video");

  const track =
    tracks.find((t) => t.languageCode === "en") ||
    tracks.find((t) => t.languageCode.startsWith("en")) ||
    tracks[0];

  const xmlRes = await fetch(track.baseUrl);
  if (!xmlRes.ok) throw new Error("Failed to fetch transcript content");
  const xml = await xmlRes.text();

  const segments: { start: number; duration: number; text: string }[] = [];
  const regex = /<text start="([^"]+)" dur="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g;
  let match;

  while ((match = regex.exec(xml)) !== null) {
    const text = decodeHtmlEntities(match[3]);
    if (text) {
      segments.push({
        start: parseFloat(match[1]),
        duration: parseFloat(match[2]),
        text,
      });
    }
  }

  if (!segments.length) throw new Error("Transcript is empty");

  return {
    segments,
    language: track.languageCode,
    trackName: track.name?.simpleText || "Auto-generated",
    availableTracks: tracks.map((t) => ({
      code: t.languageCode,
      name: t.name?.simpleText || t.languageCode,
    })),
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url } = await request.json();
  if (!url?.trim()) return NextResponse.json({ error: "YouTube URL required" }, { status: 400 });

  const videoId = extractVideoId(url.trim());
  if (!videoId)
    return NextResponse.json({ error: "Invalid YouTube URL or video ID" }, { status: 400 });

  try {
    const result = await fetchTranscript(videoId);

    const fullText = result.segments.map((s) => s.text).join(" ");
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;

    const lastSeg = result.segments[result.segments.length - 1];
    const totalSeconds = lastSeg ? lastSeg.start + lastSeg.duration : 0;
    const speakingPaceWpm =
      totalSeconds > 0 ? Math.round(wordCount / (totalSeconds / 60)) : 0;

    return NextResponse.json({
      videoId,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      language: result.language,
      trackName: result.trackName,
      availableTracks: result.availableTracks,
      segments: result.segments,
      fullText,
      wordCount,
      totalSeconds: Math.round(totalSeconds),
      formattedDuration: formatTime(totalSeconds),
      speakingPaceWpm,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch transcript";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
