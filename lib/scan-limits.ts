import { createServiceClient } from "./supabase/server";
import type { Profile } from "@/types/database";

export const PLAN_SCAN_LIMITS: Record<string, number> = {
  free: 3,
  creator: 3,
  admin: Infinity,
  pro: Infinity,
  agency: Infinity,
};

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export async function checkAndIncrementScan(
  userId: string,
  plan: string
): Promise<{ allowed: boolean; remaining: number | null; scansToday: number }> {
  const supabase = await createServiceClient();

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("scans_today, scans_reset_date")
    .eq("id", userId)
    .single();

  const profile = profileRaw as Pick<
    Profile,
    "scans_today" | "scans_reset_date"
  > | null;

  if (!profile) {
    return { allowed: false, remaining: 0, scansToday: 0 };
  }

  let scansToday = profile.scans_today || 0;

  if (profile.scans_reset_date !== todayStr()) {
    await supabase
      .from("profiles")
      .update({
        scans_today: 0,
        scans_reset_date: todayStr(),
      } as Partial<Profile>)
      .eq("id", userId);
    scansToday = 0;
  }

  const limit = PLAN_SCAN_LIMITS[plan] ?? 1;

  if (limit !== Infinity && scansToday >= limit) {
    return { allowed: false, remaining: 0, scansToday };
  }

  await supabase
    .from("profiles")
    .update({ scans_today: scansToday + 1 } as Partial<Profile>)
    .eq("id", userId);

  const remaining = limit === Infinity ? null : limit - scansToday - 1;
  return { allowed: true, remaining, scansToday: scansToday + 1 };
}
