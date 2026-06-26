import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CommentsIntelligence from "@/components/dashboard/CommentsIntelligence";

export default async function CommentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isAdmin = (process.env.ADMIN_EMAIL || "").split(",").map(e => e.trim()).includes(user.email || "");

  return <CommentsIntelligence isAdmin={isAdmin} />;
}
