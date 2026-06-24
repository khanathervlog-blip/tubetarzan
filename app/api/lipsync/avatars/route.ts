import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PEXELS_QUERIES = ["person talking camera", "woman speaking studio", "man speaking professional"];

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return NextResponse.json({ avatars: [] });

  const query = PEXELS_QUERIES[Math.floor(Math.random() * PEXELS_QUERIES.length)];

  try {
    const res = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=6&size=medium&orientation=portrait`,
      { headers: { Authorization: apiKey } }
    );

    if (!res.ok) return NextResponse.json({ avatars: [] });
    const data = await res.json();

    const avatars = (data.videos || []).map((v: {
      id: number;
      image: string;
      duration: number;
      video_files: { link: string; quality: string; file_type: string }[];
    }) => ({
      id: String(v.id),
      thumbnailUrl: v.image,
      duration: v.duration,
      videoUrl: v.video_files?.find((f) => f.quality === "sd" && f.file_type === "video/mp4")?.link || v.video_files?.[0]?.link,
    })).filter((a: { videoUrl?: string }) => a.videoUrl);

    return NextResponse.json({ avatars });
  } catch {
    return NextResponse.json({ avatars: [] });
  }
}
