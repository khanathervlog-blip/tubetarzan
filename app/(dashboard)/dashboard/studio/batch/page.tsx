import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BatchContent from "@/components/dashboard/BatchContent";

export default async function BatchPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <BatchContent />;
}
