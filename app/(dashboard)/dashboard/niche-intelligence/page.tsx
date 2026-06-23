import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import NicheIntelligencePage from "@/components/dashboard/NicheIntelligencePage";

export const metadata = {
  title: "Niche RPM Guide — TubeTarzan",
  description: "Find the most profitable YouTube niches. See RPM, CPM, competition, and revenue estimates.",
};

export default async function NicheIntelligenceRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Try to load niche data from DB — fall back to hardcoded if table doesn't exist
  let dbNiches: {
    niche: string;
    category: string;
    rpm: number;
    cpm: number;
    competition: "low" | "medium" | "high";
    difficulty: "easy" | "medium" | "hard";
    country: string;
  }[] = [];

  try {
    const svc = await createServiceClient();
    const { data } = await svc
      .from("niche_rpm_data")
      .select("niche_keyword, category, avg_rpm_usd, avg_cpm_usd, competition_level, monetization_difficulty, best_audience_country")
      .order("avg_rpm_usd", { ascending: false });

    if (data && data.length > 0) {
      dbNiches = (data as Record<string, unknown>[]).map((row) => ({
        niche: row.niche_keyword as string,
        category: (row.category as string) || "General",
        rpm: (row.avg_rpm_usd as number) || 0,
        cpm: (row.avg_cpm_usd as number) || 0,
        competition: (row.competition_level as "low" | "medium" | "high") || "medium",
        difficulty: (row.monetization_difficulty as "easy" | "medium" | "hard") || "medium",
        country: (row.best_audience_country as string) || "US",
      }));
    }
  } catch {
    // Table doesn't exist — component falls back to hardcoded data
  }

  return <NicheIntelligencePage dbNiches={dbNiches} />;
}
