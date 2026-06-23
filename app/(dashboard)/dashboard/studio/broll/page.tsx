import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BrollStudio from "@/components/dashboard/BrollStudio";

export const metadata = {
  title: "B-roll Studio — TubeTarzan",
  description: "Search free stock footage from Pexels & Pixabay or generate AI B-roll with Kling.",
};

export default async function BrollStudioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <BrollStudio />;
}
