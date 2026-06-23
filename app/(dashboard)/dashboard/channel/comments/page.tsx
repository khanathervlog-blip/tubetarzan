import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CommentsIntelligence from "@/components/dashboard/CommentsIntelligence";

export default async function CommentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <CommentsIntelligence />;
}
