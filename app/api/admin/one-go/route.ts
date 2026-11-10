import { type NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

function isAdmin(email: string | undefined): boolean {
  if (!email) return false;
  return (process.env.ADMIN_EMAIL || "").split(",").map(e => e.trim()).includes(email);
}

// GET /api/admin/one-go — list recent jobs + config
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const serviceSupabase = await createServiceClient();
  const [jobsRes, configRes] = await Promise.all([
    serviceSupabase
      .from("one_go_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
    serviceSupabase
      .from("one_go_config")
      .select("*")
      .limit(1)
      .single(),
  ]);

  return NextResponse.json({
    jobs: jobsRes.data || [],
    config: configRes.data || null,
  });
}

// POST /api/admin/one-go — start a One Go run
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const serviceSupabase = await createServiceClient();

  // Load config
  const { data: config } = await serviceSupabase
    .from("one_go_config")
    .select("*")
    .limit(1)
    .single();

  if (!config) {
    return NextResponse.json(
      { error: "One Go not configured. Go to Settings first." },
      { status: 400 }
    );
  }

  // Check monthly limit
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);
  const { count } = await serviceSupabase
    .from("one_go_jobs")
    .select("id", { count: "exact", head: true })
    .gte("created_at", thisMonth.toISOString());

  const maxRuns = config.max_runs_per_month || 8;
  if ((count || 0) >= maxRuns) {
    return NextResponse.json(
      { error: `Monthly limit of ${maxRuns} One Go runs reached.` },
      { status: 429 }
    );
  }

  // Create job record
  const { data: job, error } = await serviceSupabase
    .from("one_go_jobs")
    .insert({
      channel_id: config.channel_id,
      channel_handle: config.channel_handle,
      channel_niche: config.channel_niche,
      face_video_url: config.face_video_url,
      voice_preset_id: config.voice_preset_id,
      caption_style: config.caption_style,
      auto_post: config.auto_post,
      post_platforms: config.post_platforms,
      overall_status: "running",
      current_step: "Starting pipeline...",
      progress_percent: 0,
    })
    .select()
    .single();

  if (error || !job) {
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }

  // Fire pipeline async (non-blocking)
  fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/one-go/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-secret": process.env.ADMIN_SECRET || "" },
    body: JSON.stringify({ jobId: job.id, config }),
  }).catch(err => console.error("[OneGo] pipeline trigger failed:", err));

  return NextResponse.json({ jobId: job.id });
}

// PATCH /api/admin/one-go — save config
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const serviceSupabase = await createServiceClient();

  // Upsert config (only one row ever exists)
  const { data: existing } = await serviceSupabase
    .from("one_go_config")
    .select("id")
    .limit(1)
    .single();

  if (existing) {
    await serviceSupabase
      .from("one_go_config")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await serviceSupabase.from("one_go_config").insert(body);
  }

  return NextResponse.json({ ok: true });
}
