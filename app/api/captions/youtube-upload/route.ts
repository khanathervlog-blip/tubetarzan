import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/youtube-auth";
import { rateLimit, TOO_MANY } from "@/lib/rate-limit";

/** Uploads ONE caption track (SRT) to a video on the user's own connected YouTube channel. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimit(`captions-yt:${user.id}`, 40, 10 * 60_000)) return NextResponse.json(TOO_MANY, { status: 429 });

  // YouTube API quota is shared by every user (each upload = 400 units of our daily 10,000), so paid plans / admin only
  const { data: profileRaw } = await supabase.from("profiles").select("subscription_plan, email").eq("id", user.id).single();
  const profile = profileRaw as { subscription_plan: string; email: string } | null;
  const isAdmin = (process.env.ADMIN_EMAIL || "").split(",").map((e) => e.trim()).includes(profile?.email || user.email || "");
  if ((profile?.subscription_plan || "free") === "free" && !isAdmin) {
    return NextResponse.json({ error: "Uploading captions to YouTube needs the Creator plan or above.", upgradeRequired: true }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const videoId = String(body.videoId || "");
  const language = String(body.language || "");
  const name = String(body.name || language).slice(0, 100);
  const srt = String(body.srt || "");
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId) || !/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})?$/.test(language) || !srt || srt.length > 500_000) {
    return NextResponse.json({ error: "Valid videoId, language and srt are required." }, { status: 400 });
  }

  let token: string;
  try {
    token = await getValidAccessToken(user.id);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Reconnect your YouTube channel." }, { status: 400 });
  }

  const boundary = "tt" + crypto.randomUUID();
  const metadata = JSON.stringify({ snippet: { videoId, language, name, isDraft: false } });
  const multipart =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
    `--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n${srt}\r\n--${boundary}--`;

  const res = await fetch("https://www.googleapis.com/upload/youtube/v3/captions?uploadType=multipart&part=snippet", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary=${boundary}` },
    body: multipart,
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: { message?: string; errors?: { reason?: string }[] } };
    const reason = j.error?.errors?.[0]?.reason || "";
    const msg =
      reason === "captionExists" || reason === "duplicate" ? "A caption in this language already exists on that video - delete it in YouTube Studio first."
      : reason === "forbidden" || res.status === 403 ? (j.error?.message || "YouTube refused: this video isn't on your connected channel, or the daily YouTube quota is used up.")
      : j.error?.message || `YouTube returned ${res.status}`;
    return NextResponse.json({ error: msg }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
