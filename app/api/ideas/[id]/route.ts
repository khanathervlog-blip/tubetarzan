import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ViralIdea } from "@/types/database";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from("viral_ideas")
    .select("id, user_id")
    .eq("id", params.id)
    .single();

  if (!existing || (existing as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: Partial<Pick<ViralIdea, "status" | "is_done" | "notes">>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const updates: Partial<ViralIdea> = {};
  if (body.status !== undefined) updates.status = body.status;
  if (body.is_done !== undefined) {
    updates.is_done = body.is_done;
    if (body.is_done) {
      updates.status = "done";
      updates.done_at = new Date().toISOString();
    }
  }
  if (body.notes !== undefined) updates.notes = body.notes;

  const { error } = await supabase
    .from("viral_ideas")
    .update(updates as Partial<ViralIdea>)
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: "Failed to update idea" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: existing } = await supabase
    .from("viral_ideas")
    .select("id, user_id, status")
    .eq("id", params.id)
    .single();

  if (!existing || (existing as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if ((existing as { status: string }).status !== "pending") {
    return NextResponse.json(
      { error: "Only pending ideas can be deleted" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("viral_ideas")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete idea" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
