import { redirect } from "next/navigation";
import LipSyncStudio from "@/components/dashboard/LipSyncStudio";
import { createClient } from "@/lib/supabase/server";
import { canUseLipSync } from "@/lib/lipsync-access";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata = { title: "Lip Sync Studio | TubeTarzan" };

export default async function LipSyncPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const svc = await createServiceClient();
  const { data: profile } = await svc.from("profiles").select("subscription_plan").eq("id", user.id).single();
  // Admins and paid plans with Lip Sync minutes (see lib/plans.ts); everyone else goes back to the dashboard
  if (!canUseLipSync(user.email, profile?.subscription_plan as string | undefined)) redirect("/dashboard");
  return <LipSyncStudio />;
}
