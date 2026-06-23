import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/admin-exemption";

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const svc = await createServiceClient();
  const { data, error } = await svc
    .from("testimonials")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ testimonials: data || [] });
}

export async function POST(request: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { name, role, quote, avatar_url, rating, is_featured, sort_order } = body;
  if (!name || !quote) return NextResponse.json({ error: "name and quote required" }, { status: 400 });

  const svc = await createServiceClient();
  const { data, error } = await svc
    .from("testimonials")
    .insert({ name, role, quote, avatar_url, rating: rating || 5, is_featured: is_featured || false, sort_order: sort_order || 0 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ testimonial: data });
}

export async function PUT(request: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const allowed = ["name", "role", "quote", "avatar_url", "rating", "is_featured", "sort_order"];
  const sanitized: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in updates) sanitized[key] = updates[key];
  }

  const svc = await createServiceClient();
  const { error } = await svc.from("testimonials").update(sanitized).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const svc = await createServiceClient();
  const { error } = await svc.from("testimonials").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
