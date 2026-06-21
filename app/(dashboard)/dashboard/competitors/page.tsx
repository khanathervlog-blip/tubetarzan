import CompetitorList from "@/components/dashboard/CompetitorList";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function CompetitorsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <CompetitorList />;
}
