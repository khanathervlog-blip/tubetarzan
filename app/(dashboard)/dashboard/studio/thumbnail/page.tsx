import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ThumbnailGenerator from "@/components/dashboard/ThumbnailGenerator";

export default async function ThumbnailPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <ThumbnailGenerator />;
}
