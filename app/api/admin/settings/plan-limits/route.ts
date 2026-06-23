import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/admin-exemption";

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const svc = await createServiceClient();
  const { data, error } = await svc
    .from("plan_limits")
    .select("*")
    .order("plan", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ limits: data || [] });
}

export async function PATCH(request: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { plan, ...updates } = body;
  if (!plan) return NextResponse.json({ error: "plan required" }, { status: 400 });

  const allowed = ["daily_scans", "monthly_scans", "channels", "ai_scripts", "bulk_limit"];
  const sanitized: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in updates) sanitized[key] = Number(updates[key]);
  }

  const svc = await createServiceClient();

  await svc.from("admin_activity_log").insert({
    admin_email: admin.email,
    action: "update_plan_limits",
    target_type: "system",
    details: { plan, ...sanitized },
  });

  const { error } = await svc
    .from("plan_limits")
    .upsert({ plan, ...sanitized }, { onConflict: "plan" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
