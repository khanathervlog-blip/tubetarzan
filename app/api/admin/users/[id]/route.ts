import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/admin-exemption";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const svc = await createServiceClient();
  const { data, error } = await svc
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ user: data });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { action, ...updateData } = body;

  const svc = await createServiceClient();
  const updates: Record<string, unknown> = {};
  let logAction = action || "update_user";

  if (action === "suspend") {
    updates.is_suspended = true;
    updates.suspended_at = new Date().toISOString();
    updates.suspension_reason = updateData.reason || "Suspended by admin";
    logAction = "suspend_user";
  } else if (action === "unsuspend") {
    updates.is_suspended = false;
    updates.suspension_reason = null;
    updates.suspended_at = null;
    logAction = "unsuspend_user";
  } else if (action === "reset_risk") {
    updates.security_risk_score = 0;
    logAction = "reset_risk_score";
  } else {
    const allowed = [
      "notes_internal",
      "security_risk_score",
      "rate_limit_override",
      "quota_override",
      "subscription_plan",
    ];
    for (const key of allowed) {
      if (key in updateData) updates[key] = updateData[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid updates" }, { status: 400 });
  }

  // Log BEFORE taking action (required by security policy)
  await svc.from("admin_activity_log").insert({
    admin_email: admin.email,
    action: logAction,
    target_type: "user",
    target_id: params.id,
    details: updateData,
  });

  const { error } = await svc
    .from("profiles")
    .update(updates)
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
