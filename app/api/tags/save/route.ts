import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Requires: ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tag_bank jsonb DEFAULT '[]';
// Run this in Supabase SQL Editor before using this endpoint.

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { tags?: string[]; niche?: string; sourceVideoId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.tags || !Array.isArray(body.tags) || body.tags.length === 0) {
    return NextResponse.json({ error: "tags array is required" }, { status: 400 });
  }

  const entry = {
    tags: body.tags,
    niche: body.niche || "",
    sourceVideoId: body.sourceVideoId || null,
    savedAt: new Date().toISOString(),
  };

  // Read existing tag bank, append, deduplicate, save
  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("tag_bank")
    .eq("id", user.id)
    .single();

  const existing = (profileRaw as { tag_bank?: unknown[] } | null)?.tag_bank || [];
  const updated = [entry, ...(existing as typeof entry[])].slice(0, 50); // keep latest 50

  const { error } = await supabase
    .from("profiles")
    .update({ tag_bank: updated } as Record<string, unknown>)
    .eq("id", user.id);

  if (error) {
    console.error("tag_bank update error:", error);
    return NextResponse.json({ error: "Failed to save tags" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
