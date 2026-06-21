import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import IntelligenceBoardPage from "@/components/dashboard/IntelligenceBoardPage";
import type { Profile } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select(
      "subscription_plan, onboarding_completed, youtube_quota_used_today, youtube_quota_reset_date, scans_today, scans_reset_date"
    )
    .eq("id", user.id)
    .single();

  const profile = profileRaw as Pick<
    Profile,
    | "subscription_plan"
    | "onboarding_completed"
    | "youtube_quota_used_today"
    | "youtube_quota_reset_date"
    | "scans_today"
    | "scans_reset_date"
  > | null;

  if (!profile?.onboarding_completed) {
    redirect("/onboarding");
  }

  const isAdmin = (process.env.ADMIN_EMAIL || "").split(",").map(e => e.trim()).includes(user.email || "");

  return <IntelligenceBoardPage profile={profile!} isAdmin={isAdmin} />;
}
