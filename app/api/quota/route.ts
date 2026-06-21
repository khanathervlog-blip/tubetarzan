import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

const PLAN_SCAN_LIMITS: Record<string, number | null> = {
  free: 1,
  creator: 3,
  pro: null,
  agency: null,
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select(
      "subscription_plan, scans_today, scans_reset_date, youtube_quota_used_today, youtube_quota_reset_date"
    )
    .eq("id", user.id)
    .single();

  const profile = profileRaw as Pick<
    Profile,
    | "subscription_plan"
    | "scans_today"
    | "scans_reset_date"
    | "youtube_quota_used_today"
    | "youtube_quota_reset_date"
  > | null;

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const plan = profile.subscription_plan || "free";
  const today = new Date().toISOString().split("T")[0];

  const scansToday =
    profile.scans_reset_date === today ? profile.scans_today || 0 : 0;
  const quotaUsedToday =
    profile.youtube_quota_reset_date === today
      ? profile.youtube_quota_used_today || 0
      : 0;

  const scanLimit = PLAN_SCAN_LIMITS[plan];

  // Midnight Pacific time
  const now = new Date();
  const pacific = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
  );
  pacific.setDate(pacific.getDate() + 1);
  pacific.setHours(0, 0, 0, 0);
  const resetAt = pacific.toISOString();

  return NextResponse.json({
    usedToday: quotaUsedToday,
    limit: 10000,
    scansToday,
    scanLimit,
    resetAt,
    plan,
  });
}
