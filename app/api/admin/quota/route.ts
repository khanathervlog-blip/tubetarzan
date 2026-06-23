import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/admin-exemption";

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const svc = await createServiceClient();

  const { data: topUsers } = await svc
    .from("profiles")
    .select("id, email, subscription_plan, scans_today, quota_override, rate_limit_override")
    .gt("scans_today", 0)
    .order("scans_today", { ascending: false })
    .limit(20);

  const today = new Date().toISOString().split("T")[0];
  let costs: unknown[] = [];
  try {
    const costsRes = await svc.from("daily_costs").select("*").eq("date", today);
    costs = costsRes.data || [];
  } catch { /* table may not exist yet */ }

  return NextResponse.json({ topUsers: topUsers || [], costs: costs || [] });
}

export async function PATCH(request: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId, quota_override, rate_limit_override } = await request.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const svc = await createServiceClient();

  await svc.from("admin_activity_log").insert({
    admin_email: admin.email,
    action: "set_quota_override",
    target_type: "user",
    target_id: userId,
    details: { quota_override, rate_limit_override },
  });

  const updates: Record<string, unknown> = {};
  if (quota_override !== undefined)
    updates.quota_override = quota_override === "" ? null : Number(quota_override);
  if (rate_limit_override !== undefined)
    updates.rate_limit_override = rate_limit_override === "" ? null : Number(rate_limit_override);

  await svc.from("profiles").update(updates).eq("id", userId);
  return NextResponse.json({ success: true });
}
