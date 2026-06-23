import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/admin-exemption";

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const svc = await createServiceClient();
  const { data } = await svc
    .from("niche_rpm_data")
    .select("*")
    .order("avg_rpm_usd", { ascending: false });

  return NextResponse.json({ niches: data || [] });
}

export async function POST(request: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  if (!body.niche_keyword?.trim())
    return NextResponse.json({ error: "niche_keyword required" }, { status: 400 });

  const svc = await createServiceClient();
  const { data, error } = await svc
    .from("niche_rpm_data")
    .insert({
      niche_keyword: body.niche_keyword.trim(),
      category: body.category || null,
      avg_rpm_usd: body.avg_rpm_usd ? Number(body.avg_rpm_usd) : null,
      avg_cpm_usd: body.avg_cpm_usd ? Number(body.avg_cpm_usd) : null,
      competition_level: body.competition_level || "medium",
      best_audience_country: body.best_audience_country || "US",
      monetization_difficulty: body.monetization_difficulty || "medium",
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ niche: data });
}

export async function PUT(request: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const svc = await createServiceClient();
  const { error } = await svc
    .from("niche_rpm_data")
    .update({
      niche_keyword: body.niche_keyword,
      category: body.category,
      avg_rpm_usd: body.avg_rpm_usd ? Number(body.avg_rpm_usd) : null,
      avg_cpm_usd: body.avg_cpm_usd ? Number(body.avg_cpm_usd) : null,
      competition_level: body.competition_level,
      best_audience_country: body.best_audience_country,
      monetization_difficulty: body.monetization_difficulty,
      notes: body.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const svc = await createServiceClient();
  await svc.from("niche_rpm_data").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
