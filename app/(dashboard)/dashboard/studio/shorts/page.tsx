import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ShortsFactory from "@/components/dashboard/ShortsFactory";

export default async function ShortsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <ShortsFactory />;
}
