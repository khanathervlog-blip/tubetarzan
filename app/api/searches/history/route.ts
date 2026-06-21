import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_HISTORY = 10;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("user_search_history")
    .select("id, niche, results, searched_at")
    .eq("user_id", user.id)
    .order("searched_at", { ascending: false })
    .limit(MAX_HISTORY);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ searches: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { niche?: string; results?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.niche || !body.results) {
    return NextResponse.json({ error: "Missing niche or results" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("user_search_history")
    .insert({ user_id: user.id, niche: body.niche, results: body.results })
    .select("id, searched_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Prune: keep only the latest MAX_HISTORY rows per user
  const { data: old } = await supabase
    .from("user_search_history")
    .select("id")
    .eq("user_id", user.id)
    .order("searched_at", { ascending: false })
    .range(MAX_HISTORY, 999);

  if (old && old.length > 0) {
    await supabase
      .from("user_search_history")
      .delete()
      .in(
        "id",
        (old as { id: number }[]).map((r) => r.id)
      );
  }

  return NextResponse.json({ id: data.id, searched_at: data.searched_at });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabase.from("user_search_history").delete().eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
