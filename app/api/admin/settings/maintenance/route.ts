import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/admin-exemption";
import { SITE_SETTINGS_TAG } from "@/lib/site-settings";

/** POST { enabled: boolean } - admin only. Site settings are written with the service key, never from the browser. */
export async function POST(request: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { enabled } = (await request.json().catch(() => ({}))) as { enabled?: unknown };
  if (typeof enabled !== "boolean") return NextResponse.json({ error: "enabled must be true or false" }, { status: 400 });

  const svc = await createServiceClient();
  const { error } = await svc
    .from("admin_settings")
    .upsert({ key: "maintenance_mode", value: enabled ? "true" : "false", updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) return NextResponse.json({ error: "Could not save" }, { status: 500 });
  await svc.from("admin_activity_log").insert({
    admin_email: admin.email,
    action: "maintenance_mode",
    target_type: "system",
    details: { enabled },
  });
  revalidateTag(SITE_SETTINGS_TAG);
  return NextResponse.json({ ok: true, enabled });
}
