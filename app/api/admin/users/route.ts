import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/admin-exemption";

export async function GET(request: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const plan = searchParams.get("plan") || "";
  const suspended = searchParams.get("suspended") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = 50;
  const offset = (page - 1) * limit;

  const svc = await createServiceClient();

  let query = svc
    .from("profiles")
    .select(
      "id, email, subscription_plan, subscription_status, created_at, scans_today, security_risk_score, is_suspended, is_test_account",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) query = query.ilike("email", `%${search}%`);
  if (plan) query = query.eq("subscription_plan", plan);
  if (suspended === "true") query = query.eq("is_suspended", true);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ users: data || [], total: count || 0, page, limit });
}
