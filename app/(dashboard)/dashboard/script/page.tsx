import ScriptWriter from "@/components/dashboard/ScriptWriter";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ScriptPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <ScriptWriter />;
}
