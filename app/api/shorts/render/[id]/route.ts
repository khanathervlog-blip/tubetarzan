import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Render status proxy (keeps the Railway token on the server). */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(params.id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const base = process.env.FFMPEG_SERVICE_URL || process.env.NEXT_PUBLIC_FFMPEG_SERVICE_URL;
  const token = process.env.RAILWAY_SERVICE_TOKEN;
  if (!base || !token) return NextResponse.json({ status: "failed" }, { status: 503 });
  try {
    const res = await fetch(`${base.replace(/\/+$/, "")}/render/status/${params.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ status: data.status || "processing", url: data.url || data.output_url || null });
  } catch {
    return NextResponse.json({ status: "failed" }, { status: 502 });
  }
}
