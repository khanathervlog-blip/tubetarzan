import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateVideoIdea } from "@/lib/claude";
import type { Profile } from "@/types/database";
import type { EnrichedVideo } from "@/types/youtube";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("subscription_plan")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as Pick<Profile, "subscription_plan"> | null;
  const plan = profile?.subscription_plan || "free";

  // Free plan: 2 idea generations per day (tracked via ideas count today)
  if (plan === "free") {
    const today = new Date().toISOString().split("T")[0];
    const { count } = await supabase
      .from("viral_ideas")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", `${today}T00:00:00.000Z`);

    if ((count || 0) >= 2) {
      return NextResponse.json(
        {
          error: "Free plan allows 2 AI-generated ideas per day. Upgrade to Creator for unlimited.",
          upgradeRequired: true,
        },
        { status: 429 }
      );
    }
  }

  let body: { sourceVideo?: EnrichedVideo; niche?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.sourceVideo || !body.niche) {
    return NextResponse.json(
      { error: "sourceVideo and niche are required" },
      { status: 400 }
    );
  }

  try {
    const idea = await generateVideoIdea(body.sourceVideo, body.niche);
    return NextResponse.json(idea);
  } catch (error) {
    console.error("generateVideoIdea error:", error);
    return NextResponse.json(
      { error: "Failed to generate idea. Please try again." },
      { status: 500 }
    );
  }
}
