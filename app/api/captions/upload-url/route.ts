import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { rateLimit, TOO_MANY } from "@/lib/rate-limit";

const CAPTION_BUCKET = "captions";
const MAX_BYTES = 45 * 1024 * 1024; // Supabase free tier allows 50 MB per file

/**
 * POST { filename, size } -> { path, token }   then   POST { readPath } -> { videoUrl }
 * The browser uploads the video straight to private storage (signed upload URL), and the Railway captions
 * service downloads it through a signed read URL. (A blob: link from the browser can never be fetched by a server.)
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimit(`captions-upload:${user.id}`, 8, 10 * 60_000)) return NextResponse.json(TOO_MANY, { status: 429 });

  const body = (await request.json().catch(() => ({}))) as { filename?: string; size?: number; readPath?: string };

  // Step 2 (after the upload finished): hand out a signed READ link - only for this user's own file
  if (body.readPath) {
    const p = body.readPath;
    if (!/^\d{4}-\d{2}-\d{2}\/[A-Za-z0-9_-]+\.[a-z0-9]{2,5}$/i.test(p) || !p.split("/")[1].startsWith(`${user.id}_`)) {
      return NextResponse.json({ error: "Invalid file" }, { status: 400 });
    }
    const svcRead = await createServiceClient();
    const { data: read } = await svcRead.storage.from(CAPTION_BUCKET).createSignedUrl(p, 2 * 60 * 60);
    if (!read?.signedUrl) return NextResponse.json({ error: "Could not prepare the video link." }, { status: 500 });
    return NextResponse.json({ videoUrl: read.signedUrl });
  }

  const { filename, size } = body;
  if (typeof size !== "number" || size <= 0) return NextResponse.json({ error: "size required" }, { status: 400 });
  if (size > MAX_BYTES) return NextResponse.json({ error: "Video is larger than 45 MB. Export it smaller (720p) and try again." }, { status: 413 });

  const ext = (/\.([a-z0-9]{2,5})$/i.exec(filename || "")?.[1] || "mp4").toLowerCase();
  const day = new Date().toISOString().slice(0, 10); // folder per day makes the daily cleanup trivial
  const path = `${day}/${user.id}_${randomUUID()}.${ext}`;

  const svc = await createServiceClient();
  let { data: signed, error } = await svc.storage.from(CAPTION_BUCKET).createSignedUploadUrl(path);
  if (error) {
    // first use: create the private bucket, then retry once
    await svc.storage.createBucket(CAPTION_BUCKET, { public: false, fileSizeLimit: MAX_BYTES });
    ({ data: signed, error } = await svc.storage.from(CAPTION_BUCKET).createSignedUploadUrl(path));
  }
  if (error || !signed) return NextResponse.json({ error: "Storage is not ready. Please try again." }, { status: 500 });

  return NextResponse.json({ path: signed.path, token: signed.token });
}
