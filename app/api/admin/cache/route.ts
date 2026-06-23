import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/admin-exemption";

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const svc = await createServiceClient();

  const [searchRes, ideasRes, transcriptRes] = await Promise.allSettled([
    svc.from("search_cache").select("id", { count: "exact", head: true }),
    svc.from("claude_ideas_cache").select("id", { count: "exact", head: true }),
    svc.from("transcript_cache").select("id", { count: "exact", head: true }),
  ]);

  return NextResponse.json({
    search_cache: searchRes.status === "fulfilled" ? (searchRes.value.count || 0) : 0,
    claude_ideas: ideasRes.status === "fulfilled" ? (ideasRes.value.count || 0) : 0,
    transcripts: transcriptRes.status === "fulfilled" ? (transcriptRes.value.count || 0) : 0,
  });
}

export async function DELETE(request: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { type } = await request.json();
  const svc = await createServiceClient();

  await svc.from("admin_activity_log").insert({
    admin_email: admin.email,
    action: "clear_cache",
    target_type: "system",
    details: { cache_type: type },
  });

  const NULL_UUID = "00000000-0000-0000-0000-000000000000";

  const safeDel = async (table: string) => {
    try { await svc.from(table).delete().gte("id", NULL_UUID); } catch { /* ignore */ }
  };

  if (type === "search") {
    await safeDel("search_cache");
  } else if (type === "claude") {
    await safeDel("claude_ideas_cache");
  } else if (type === "transcripts") {
    await safeDel("transcript_cache");
  } else if (type === "all") {
    await Promise.allSettled([
      safeDel("search_cache"),
      safeDel("claude_ideas_cache"),
      safeDel("transcript_cache"),
    ]);
  } else {
    return NextResponse.json({ error: "Invalid cache type" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
