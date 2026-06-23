import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AudioStudio from "@/components/dashboard/AudioStudio";

export const metadata = {
  title: "Audio Studio — TubeTarzan",
  description: "Convert scripts to voiceover audio using Google Cloud TTS.",
};

export default async function AudioStudioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <AudioStudio />;
}
