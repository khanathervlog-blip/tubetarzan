import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/admin-exemption";

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const svc = await createServiceClient();
  const { data, error } = await svc
    .from("feature_flags")
    .select("*")
    .order("label", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ flags: data || [] });
}

export async function PATCH(request: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { key, is_enabled } = await request.json();
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

  const svc = await createServiceClient();

  await svc.from("admin_activity_log").insert({
    admin_email: admin.email,
    action: "toggle_feature_flag",
    target_type: "system",
    details: { key, is_enabled },
  });

  const { error } = await svc
    .from("feature_flags")
    .update({ is_enabled, updated_at: new Date().toISOString() })
    .eq("key", key);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
