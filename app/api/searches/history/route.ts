import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_HISTORY = 10;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Each row carries a full results blob, so only load as many as the client will actually show.
  const requested = parseInt(request.nextUrl.searchParams.get("limit") || "", 10);
  const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), MAX_HISTORY) : MAX_HISTORY;

  const { data, error } = await supabase
    .from("user_search_history")
    .select("id, niche, results, searched_at")
    .eq("user_id", user.id)
    .order("searched_at", { ascending: false })
    .limit(limit);

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
    const raw = await request.text();
    if (raw.length > 3_000_000) return NextResponse.json({ error: "Too large" }, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.niche || typeof body.niche !== "string" || body.niche.length > 200 || !body.results) {
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
