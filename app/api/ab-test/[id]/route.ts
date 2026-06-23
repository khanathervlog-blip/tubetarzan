import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/youtube-auth";

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = await createServiceClient();
  const { data: test } = await svc
    .from("ab_tests")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!test) return NextResponse.json({ error: "Test not found" }, { status: 404 });

  // Revert video to variant A title
  if (test.status === "running") {
    try {
      const accessToken = await getValidAccessToken(user.id);
      const videoRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${test.video_id}&key=${process.env.YOUTUBE_API_KEY}`
      );
      const videoData = await videoRes.json();
      const snippet = videoData.items?.[0]?.snippet;
      if (snippet) {
        await fetch("https://www.googleapis.com/youtube/v3/videos?part=snippet", {
          method: "PUT",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ id: test.video_id, snippet: { ...snippet, title: test.variant_a_title } }),
        });
      }
    } catch {
      // Non-fatal: still delete the test record
    }
  }

  await svc.from("ab_tests").delete().eq("id", params.id);
  return NextResponse.json({ success: true });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { winner } = await request.json();
  if (!winner || !["a", "b", "inconclusive"].includes(winner)) {
    return NextResponse.json({ error: "winner must be 'a', 'b', or 'inconclusive'" }, { status: 400 });
  }

  const svc = await createServiceClient();
  const { data: test } = await svc
    .from("ab_tests")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();
  if (!test) return NextResponse.json({ error: "Test not found" }, { status: 404 });

  // Apply winner title to video
  if (winner === "a" || winner === "b") {
    const winnerTitle = winner === "a" ? test.variant_a_title : test.variant_b_title;
    try {
      const accessToken = await getValidAccessToken(user.id);
      const videoRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${test.video_id}&key=${process.env.YOUTUBE_API_KEY}`
      );
      const videoData = await videoRes.json();
      const snippet = videoData.items?.[0]?.snippet;
      if (snippet) {
        await fetch("https://www.googleapis.com/youtube/v3/videos?part=snippet", {
          method: "PUT",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ id: test.video_id, snippet: { ...snippet, title: winnerTitle } }),
        });
      }
    } catch {
      // Non-fatal
    }
  }

  await svc.from("ab_tests").update({
    winner,
    status: "completed",
    completed_at: new Date().toISOString(),
  }).eq("id", params.id);

  return NextResponse.json({ success: true });
}
