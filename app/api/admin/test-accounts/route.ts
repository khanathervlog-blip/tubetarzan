import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/admin-exemption";

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const svc = await createServiceClient();
  const { data: accounts } = await svc
    .from("test_accounts")
    .select("*")
    .order("created_at", { ascending: false });

  // Fetch emails separately to avoid join issues
  const userIds = (accounts || []).map((a: { user_id: string }) => a.user_id);
  const { data: profiles } = userIds.length
    ? await svc.from("profiles").select("id, email, subscription_plan").in("id", userIds)
    : { data: [] };

  const profileMap = Object.fromEntries(
    (profiles || []).map((p: { id: string; email: string; subscription_plan: string }) => [p.id, p])
  );

  const enriched = (accounts || []).map((a: Record<string, unknown>) => ({
    ...a,
    profile: profileMap[a.user_id as string] || null,
  }));

  return NextResponse.json({ accounts: enriched });
}

export async function POST(request: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId, accountLabel, planToSimulate, notes } = await request.json();
  if (!userId || !accountLabel)
    return NextResponse.json({ error: "userId and accountLabel required" }, { status: 400 });

  const svc = await createServiceClient();

  await svc.from("profiles").update({ is_test_account: true }).eq("id", userId);

  const { data, error } = await svc
    .from("test_accounts")
    .upsert({
      user_id: userId,
      account_label: accountLabel,
      plan_to_simulate: planToSimulate || "free",
      created_by_admin: admin.email,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await svc.from("admin_activity_log").insert({
    admin_email: admin.email,
    action: "create_test_account",
    target_type: "user",
    target_id: userId,
    details: { accountLabel, planToSimulate },
  });

  return NextResponse.json({ account: data });
}

export async function DELETE(request: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await request.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const svc = await createServiceClient();
  await svc.from("profiles").update({ is_test_account: false }).eq("id", userId);
  await svc.from("test_accounts").delete().eq("user_id", userId);

  await svc.from("admin_activity_log").insert({
    admin_email: admin.email,
    action: "remove_test_account",
    target_type: "user",
    target_id: userId,
  });

  return NextResponse.json({ success: true });
}
