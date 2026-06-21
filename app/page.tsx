import Navbar from "@/components/landing/Navbar";
import type { AdminSetting } from "@/types/database";
import Hero from "@/components/landing/Hero";
import SocialProofTicker from "@/components/landing/SocialProofTicker";
import Problem from "@/components/landing/Problem";
import HowItWorks from "@/components/landing/HowItWorks";
import FeatureDeepDive from "@/components/landing/FeatureDeepDive";
import DemoVideo from "@/components/landing/DemoVideo";
import Pricing from "@/components/landing/Pricing";
import Testimonials from "@/components/landing/Testimonials";
import FAQ from "@/components/landing/FAQ";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

async function getAdminSettings() {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data } = await supabase
      .from("admin_settings")
      .select("key, value")
      .in("key", [
        "hero_video_url",
        "hero_video_title",
        "announcement_bar_text",
        "announcement_bar_active",
      ]);

    const settings: Record<string, string> = {};
    (data as AdminSetting[] | null)?.forEach((row) => {
      settings[row.key] = row.value;
    });
    return settings;
  } catch {
    return {
      hero_video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      hero_video_title: "See TubeTarzan in Action",
      announcement_bar_text: "",
      announcement_bar_active: "false",
    };
  }
}

export default async function LandingPage() {
  const settings = await getAdminSettings();

  const announcementActive = settings["announcement_bar_active"] === "true";
  const announcementText = settings["announcement_bar_text"] || "";

  return (
    <main className="bg-[#080808] min-h-screen">
      {/* Announcement bar */}
      {announcementActive && announcementText && (
        <div className="bg-[#FF3B3B] text-white text-center text-sm font-medium py-2.5 px-4">
          {announcementText}
        </div>
      )}

      <Navbar />
      <Hero />
      <SocialProofTicker />
      <Problem />
      <HowItWorks />
      <FeatureDeepDive />
      <DemoVideo
        videoUrl={
          settings["hero_video_url"] ||
          "https://www.youtube.com/embed/dQw4w9WgXcQ"
        }
        videoTitle={settings["hero_video_title"] || "See TubeTarzan in Action"}
      />
      <Pricing />
      <Testimonials />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
