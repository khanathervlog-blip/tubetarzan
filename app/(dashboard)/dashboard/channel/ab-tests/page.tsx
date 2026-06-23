import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ABTestingPage from "@/components/dashboard/ABTestingPage";

export default async function ABTestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <ABTestingPage />;
}
