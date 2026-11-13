import Navbar from "@/components/landing/Navbar";
import Hero3D from "@/components/landing/Hero3D";
import InsideTubeTarzan from "@/components/landing/InsideTubeTarzan";
import HowItWorks from "@/components/landing/HowItWorks";
import DemoVideo from "@/components/landing/DemoVideo";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";
import { getLandingSettings } from "@/lib/site-settings";
import { FAQS } from "@/lib/landing-content";
import { PLAN_PRICES } from "@/lib/plans";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";
import type { Metadata } from "next";
import { safeJsonForScript } from "@/lib/html-escape";

// Static page with incremental regeneration: rendered once, then refreshed in the background at most
// every 5 minutes (or immediately when an admin saves the hero/announcement settings).
// It must not read cookies() / headers(), otherwise Next.js renders it on the server for every visit.
export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: SITE_URL },
};

const PLACEHOLDER_VIDEO = "dQw4w9WgXcQ";

async function getAdminSettings(): Promise<Record<string, string>> {
  try {
    return await getLandingSettings();
  } catch {
    return {};
  }
}

/** Structured data so Google understands the product, its prices and the FAQ (rich results). */
function jsonLd() {
  const prices = [PLAN_PRICES.creator.monthly, PLAN_PRICES.pro.monthly, PLAN_PRICES.agency.monthly];
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icon.svg`,
      email: "support@tubetarzan.com",
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "USD",
        lowPrice: 0,
        highPrice: Math.max(...prices),
        offerCount: 4,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    },
  ];
}

export default async function LandingPage() {
  const settings = await getAdminSettings();

  const announcementActive = settings["announcement_bar_active"] === "true";
  const announcementText = settings["announcement_bar_text"] || "";
  const videoUrl = settings["hero_video_url"] || "";
  const showVideo = !!videoUrl && !videoUrl.includes(PLACEHOLDER_VIDEO);

  return (
    <main className="bg-[#080808] min-h-screen overflow-x-clip">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonForScript(jsonLd()) }} />

      {announcementActive && announcementText && (
        <div className="bg-[#FF3B3B] text-white text-center text-sm font-medium py-2.5 px-4">{announcementText}</div>
      )}

      <Navbar />
      <Hero3D />
      <InsideTubeTarzan />
      <div data-reveal>
        <HowItWorks />
      </div>
      {showVideo && (
        <div data-reveal>
          <DemoVideo videoUrl={videoUrl} videoTitle={settings["hero_video_title"] || "See TubeTarzan in action"} />
        </div>
      )}
      <div data-reveal>
        <Pricing />
      </div>
      <div data-reveal>
        <FAQ />
      </div>
      <FinalCTA />
      <Footer />
    </main>
  );
}
