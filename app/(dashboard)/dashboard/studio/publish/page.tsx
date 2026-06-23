import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PublishScheduler from "@/components/dashboard/PublishScheduler";

export const metadata = {
  title: "Publish & Schedule — TubeTarzan",
  description: "Plan your content calendar and schedule posts across platforms.",
};

export default async function PublishPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <PublishScheduler />;
}
