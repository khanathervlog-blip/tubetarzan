import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminEmails = (process.env.ADMIN_EMAIL || "").split(",").map((e) => e.trim());
  if (!adminEmails.includes(user.email || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const serviceClient = await createServiceClient();
  const { data } = await serviceClient
    .from("support_knowledge")
    .select("id, title, category, content, chunk_index, source_doc, created_at, view_count")
    .eq("is_active", true)
    .order("category")
    .order("chunk_index");

  return NextResponse.json({ entries: data || [] });
}
