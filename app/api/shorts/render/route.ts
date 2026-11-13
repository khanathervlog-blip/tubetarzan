import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, TOO_MANY } from "@/lib/rate-limit";

/**
 * Starts a Shorts render on the Railway FFmpeg service. The service token stays on the server
 * (it used to be sent from the browser via NEXT_PUBLIC_RAILWAY_TOKEN, which exposes it to everyone).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimit(`shorts-render:${user.id}`, 10, 10 * 60_000)) return NextResponse.json(TOO_MANY, { status: 429 });

  // SECURITY/COST: this bills the Railway service on every call - free plan never had a cap here (bug)
  const { data: profileRaw } = await supabase.from("profiles").select("subscription_plan, email").eq("id", user.id).single();
  const profile = profileRaw as { subscription_plan: string; email: string } | null;
  const isAdmin = (process.env.ADMIN_EMAIL || "").split(",").map((e) => e.trim()).includes(profile?.email || user.email || "");
  const plan = profile?.subscription_plan || "free";
  if (plan === "free" && !isAdmin) {
    return NextResponse.json({ error: "Shorts rendering requires Creator plan or above", upgradeRequired: true }, { status: 403 });
  }

  const base = process.env.FFMPEG_SERVICE_URL || process.env.NEXT_PUBLIC_FFMPEG_SERVICE_URL;
  const token = process.env.RAILWAY_SERVICE_TOKEN;
  if (!base || !token) return NextResponse.json({ noRailway: true }, { status: 503 });

  const raw = await request.text();
  if (raw.length > 15_000_000) return NextResponse.json({ error: "Too large" }, { status: 413 });

  try {
    const res = await fetch(`${base.replace(/\/+$/, "")}/render/assemble`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: raw,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return NextResponse.json({ error: "Render service error" }, { status: 502 });
    return NextResponse.json({ jobId: data.jobId || data.job_id || data.render_id || null });
  } catch {
    return NextResponse.json({ noRailway: true }, { status: 503 });
  }
}
