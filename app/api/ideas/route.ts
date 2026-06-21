import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ViralIdea } from "@/types/database";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const niche = searchParams.get("niche");

  let query = supabase
    .from("viral_ideas")
    .select("*")
    .eq("user_id", user.id)
    .order("is_done", { ascending: true })
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (niche) query = query.ilike("niche", `%${niche}%`);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to fetch ideas" }, { status: 500 });
  }

  return NextResponse.json({ ideas: (data as ViralIdea[]) || [] });
}
