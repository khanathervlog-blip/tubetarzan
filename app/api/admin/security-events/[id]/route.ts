import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/admin-exemption";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { action_taken } = await request.json();

  const svc = await createServiceClient();
  const { error } = await svc
    .from("security_events")
    .update({
      is_resolved: true,
      resolved_at: new Date().toISOString(),
      resolved_by: admin.email,
      action_taken: action_taken || "Resolved by admin",
    })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
