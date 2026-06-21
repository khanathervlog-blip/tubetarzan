import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runViralPipeline } from "@/lib/pipeline";
import { checkAndIncrementScan, PLAN_SCAN_LIMITS } from "@/lib/scan-limits";
import { getNextApiKey } from "@/lib/youtube-key-pool";
import type { Profile } from "@/types/database";

const lastRequestTime = new Map<string, number>();

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Soft rate limit: prevent double-clicks
  const now = Date.now();
  const last = lastRequestTime.get(user.id) || 0;
  if (now - last < 10_000) {
    return NextResponse.json(
      { error: "Please wait a moment before searching again" },
      { status: 429 }
    );
  }
  lastRequestTime.set(user.id, now);

  let body: { niche?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const niche = body.niche?.trim();
  if (!niche || niche.length < 2 || niche.length > 100) {
    return NextResponse.json(
      { error: "Niche must be between 2 and 100 characters" },
      { status: 400 }
    );
  }

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select(
      "subscription_plan, subscription_status, youtube_api_key, youtube_api_key_verified, youtube_quota_used_today, youtube_quota_reset_date"
    )
    .eq("id", user.id)
    .single();

  const profile = profileRaw as Pick<
    Profile,
    | "subscription_plan"
    | "subscription_status"
    | "youtube_api_key"
    | "youtube_api_key_verified"
    | "youtube_quota_used_today"
    | "youtube_quota_reset_date"
  > | null;

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const isAdmin = (process.env.ADMIN_EMAIL || "").split(",").map(e => e.trim()).includes(user.email || "");
  const plan = isAdmin ? "admin" : (profile.subscription_plan || "free");

  let apiKey: string;
  if (plan === "pro" || plan === "agency" || plan === "admin") {
    try {
      apiKey = getNextApiKey();
    } catch {
      // Admin fallback: use personal key if platform keys not configured
      if (isAdmin && profile.youtube_api_key && profile.youtube_api_key_verified) {
        apiKey = profile.youtube_api_key;
      } else {
        return NextResponse.json(
          { error: "Platform API key not configured. Please contact support." },
          { status: 503 }
        );
      }
    }
  } else {
    if (!profile.youtube_api_key || !profile.youtube_api_key_verified) {
      return NextResponse.json(
        {
          error: "Please set up your YouTube API key in Settings first",
          requiresApiKey: true,
        },
        { status: 400 }
      );
    }
    apiKey = profile.youtube_api_key;
  }

  const scanCheck = await checkAndIncrementScan(user.id, plan);

  if (!scanCheck.allowed) {
    const limit = PLAN_SCAN_LIMITS[plan] ?? 3;
    return NextResponse.json(
      {
        error: `You've used all ${limit} scan${limit > 1 ? "s" : ""} for today. Resets at midnight.`,
        upgradeRequired: plan === "free",
        limitReached: true,
      },
      { status: 429 }
    );
  }

  try {
    const { videos, fromCache, quotaUsed, cacheError } = await runViralPipeline(
      niche,
      user.id,
      apiKey
    );

    // Track quota for free/creator (own key)
    if (!fromCache && quotaUsed > 0 && (plan === "free" || plan === "creator")) {
      const today = new Date().toISOString().split("T")[0];
      const currentUsed =
        profile.youtube_quota_reset_date === today
          ? profile.youtube_quota_used_today || 0
          : 0;
      await supabase
        .from("profiles")
        .update({
          youtube_quota_used_today: currentUsed + quotaUsed,
          youtube_quota_reset_date: today,
        } as Partial<Profile>)
        .eq("id", user.id);
    }

    const subNiches = Array.from(
      new Set(videos.map((v) => v.detectedSubNiche).filter(Boolean))
    ).slice(0, 12);

    return NextResponse.json({
      videos,
      fromCache,
      totalFound: videos.length,
      subNiches,
      quotaUsed: fromCache ? 0 : quotaUsed,
      scansRemaining: scanCheck.remaining,
      scansDone: scanCheck.scansToday,
      ...(cacheError && { cacheError }),
    });
  } catch (error) {
    console.error("Pipeline error:", error);
    return NextResponse.json(
      { error: "Search failed. Please try again." },
      { status: 500 }
    );
  }
}
