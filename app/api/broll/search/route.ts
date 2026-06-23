import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface VideoResult {
  id: string;
  source: "pexels" | "pixabay";
  url: string;
  thumbnailUrl: string;
  duration: number;
  width: number;
  height: number;
  photographer: string;
  attribution: string;
  pageUrl: string;
}

async function searchPexels(query: string): Promise<VideoResult[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return [];

  const url = new URL("https://api.pexels.com/videos/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "9");
  url.searchParams.set("orientation", "landscape");

  const res = await fetch(url.toString(), {
    headers: { Authorization: apiKey },
    next: { revalidate: 3600 },
  });

  if (!res.ok) return [];
  const data = await res.json();

  return ((data.videos as Record<string, unknown>[]) || [])
    .map((v) => {
      const files = v.video_files as Record<string, unknown>[];
      const hdFile =
        files?.find((f) => (f.quality as string) === "hd") || files?.[0];
      const user = v.user as Record<string, unknown>;
      return {
        id: `pexels_${v.id}`,
        source: "pexels" as const,
        url: hdFile?.link as string,
        thumbnailUrl: v.image as string,
        duration: v.duration as number,
        width: (hdFile?.width as number) || 1920,
        height: (hdFile?.height as number) || 1080,
        photographer: (user?.name as string) || "Pexels",
        attribution: `Video by ${user?.name || "Pexels"} on Pexels`,
        pageUrl: v.url as string,
      };
    })
    .filter((v) => v.url);
}

async function searchPixabay(query: string): Promise<VideoResult[]> {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) return [];

  const url = new URL("https://pixabay.com/api/videos/");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", query);
  url.searchParams.set("per_page", "9");
  url.searchParams.set("video_type", "film");
  url.searchParams.set("order", "popular");

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  const data = await res.json();

  return ((data.hits as Record<string, unknown>[]) || [])
    .map((v) => {
      const videos = v.videos as Record<string, Record<string, unknown>>;
      const hd = videos?.large || videos?.medium || videos?.small;
      return {
        id: `pixabay_${v.id}`,
        source: "pixabay" as const,
        url: hd?.url as string,
        thumbnailUrl:
          (v.userImageURL as string) ||
          `https://i.vimeocdn.com/video/${v.picture_id}_295x166.jpg`,
        duration: v.duration as number,
        width: (hd?.width as number) || 1920,
        height: (hd?.height as number) || 1080,
        photographer: (v.user as string) || "Pixabay",
        attribution: `Video by ${v.user || "Pixabay"} on Pixabay`,
        pageUrl: `https://pixabay.com/videos/${v.id}`,
      };
    })
    .filter((v) => v.url);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { query } = await request.json();
  if (!query?.trim())
    return NextResponse.json({ error: "Search query required" }, { status: 400 });

  const q = query.trim();

  const [pexelsResult, pixabayResult] = await Promise.allSettled([
    searchPexels(q),
    searchPixabay(q),
  ]);

  const pexels = pexelsResult.status === "fulfilled" ? pexelsResult.value : [];
  const pixabay = pixabayResult.status === "fulfilled" ? pixabayResult.value : [];

  // Interleave results for better variety
  const results: VideoResult[] = [];
  const maxLen = Math.max(pexels.length, pixabay.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < pexels.length) results.push(pexels[i]);
    if (i < pixabay.length) results.push(pixabay[i]);
  }

  return NextResponse.json({
    results,
    total: results.length,
    query: q,
    pexelsAvailable: !!process.env.PEXELS_API_KEY,
    pixabayAvailable: !!process.env.PIXABAY_API_KEY,
    klingAvailable: !!process.env.KLING_API_KEY,
  });
}
