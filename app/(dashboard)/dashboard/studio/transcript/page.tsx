import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TranscriptFetcher from "@/components/dashboard/TranscriptFetcher";

export const metadata = {
  title: "Transcript Fetcher — TubeTarzan",
  description: "Extract and analyze transcripts from any YouTube video.",
};

export default async function TranscriptPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <TranscriptFetcher />;
}
