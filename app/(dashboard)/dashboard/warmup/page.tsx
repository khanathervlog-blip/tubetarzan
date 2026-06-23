import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WarmupGuide from "@/components/dashboard/WarmupGuide";

export default async function WarmupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <WarmupGuide />;
}
