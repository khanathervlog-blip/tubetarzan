import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/youtube-auth";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
      request.headers.get("x-vercel-cron") !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const svc = await createServiceClient();
  const now = new Date().toISOString();

  // Fetch tests due for rotation
  const { data: tests } = await svc
    .from("ab_tests")
    .select("*")
    .eq("status", "running")
    .lte("rotate_at", now);

  if (!tests?.length) return NextResponse.json({ rotated: 0 });

  let rotated = 0;
  const errors: string[] = [];

  for (const test of tests) {
    try {
      const nextVariant = test.current_variant === "a" ? "b" : "a";
      const nextTitle = nextVariant === "a" ? test.variant_a_title : test.variant_b_title;

      const accessToken = await getValidAccessToken(test.user_id);
      const videoRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${test.video_id}&key=${process.env.YOUTUBE_API_KEY}`
      );
      const videoData = await videoRes.json();
      const snippet = videoData.items?.[0]?.snippet;

      if (!snippet) {
        errors.push(`Video ${test.video_id} not found — marking test as completed`);
        await svc.from("ab_tests").update({ status: "completed", winner: "inconclusive", completed_at: now }).eq("id", test.id);
        continue;
      }

      const updateRes = await fetch("https://www.googleapis.com/youtube/v3/videos?part=snippet", {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: test.video_id, snippet: { ...snippet, title: nextTitle } }),
      });

      if (!updateRes.ok) {
        errors.push(`Failed to update video ${test.video_id}: ${updateRes.status}`);
        continue;
      }

      // If both variants have been shown (we were on B), complete the test
      if (test.current_variant === "b") {
        await svc.from("ab_tests").update({
          current_variant: nextVariant,
          status: "completed",
          winner: "inconclusive",
          completed_at: now,
        }).eq("id", test.id);
      } else {
        await svc.from("ab_tests").update({
          current_variant: nextVariant,
          rotate_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        }).eq("id", test.id);
      }

      rotated++;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  return NextResponse.json({ rotated, errors });
}
