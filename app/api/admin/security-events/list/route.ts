import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/admin-exemption";

export async function GET(request: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  const svc = await createServiceClient();
  let query = svc
    .from("security_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (userId) query = query.eq("user_id", userId);

  const { data: events } = await query;

  if (!events?.length) return NextResponse.json({ events: [] });

  // Enrich with profile info
  const userIds = [...new Set(events.map((e: { user_id: string }) => e.user_id).filter(Boolean))];
  const { data: profiles } = userIds.length
    ? await svc
        .from("profiles")
        .select("id, email, security_risk_score, is_suspended")
        .in("id", userIds)
    : { data: [] };

  const profileMap = Object.fromEntries(
    (profiles || []).map((p: { id: string }) => [p.id, p])
  );

  const enriched = events.map((e: Record<string, unknown>) => ({
    ...e,
    profiles: profileMap[e.user_id as string] || null,
  }));

  return NextResponse.json({ events: enriched });
}
