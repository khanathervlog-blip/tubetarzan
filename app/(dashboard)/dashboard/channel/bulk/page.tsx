import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BulkOperationsPage from "@/components/dashboard/BulkOperationsPage";

export default async function BulkPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <BulkOperationsPage />;
}
