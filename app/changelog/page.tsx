import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export const metadata = {
  title: "Changelog — TubeTarzan",
  description: "What's new in TubeTarzan. Product updates, improvements, and bug fixes.",
};

const CHANGES = [
  {
    version: "1.4",
    date: "June 2025",
    tag: "New",
    tagColor: "bg-[#22C55E]/10 text-[#22C55E]",
    items: [
      "Fix All — bulk optimise all videos in your channel with one click (Pro & Agency plans)",
      "Video thumbnails and titles now link directly to YouTube",
      "Admin accounts bypass plan limits on all features",
      "Category ID preserved during YouTube video updates (no more category overwrites)",
    ],
  },
  {
    version: "1.3",
    date: "May 2025",
    tag: "Improved",
    tagColor: "bg-[#FFD200]/10 text-[#FFD200]",
    items: [
      "LemonSqueezy payment integration — upgrade directly from pricing page",
      "Packaging Studio: 4-step AI wizard for title, hook, thumbnail text, and tags",
      "Multi-admin support via comma-separated ADMIN_EMAIL env variable",
      "Competitor analysis with AI-generated video strategy insights",
    ],
  },
  {
    version: "1.2",
    date: "April 2025",
    tag: "New",
    tagColor: "bg-[#22C55E]/10 text-[#22C55E]",
    items: [
      "My Channel page — connect YouTube channel, view all videos with VPH and outlier scores",
      "One-click apply — push AI-optimised title, description, and tags directly to YouTube",
      "Video optimisation panel with before/after score comparison",
      "Tag bank — save and reuse tag sets from any video",
    ],
  },
  {
    version: "1.1",
    date: "March 2025",
    tag: "Improved",
    tagColor: "bg-[#FFD200]/10 text-[#FFD200]",
    items: [
      "Intelligence board now shows 200+ results (previously 50)",
      "18 viral title search patterns (up from 12)",
      "Sub-niche chip filtering from detected video topics",
      "Idea tracker — save video ideas with one click",
      "AI idea generation from any video in the results",
    ],
  },
  {
    version: "1.0",
    date: "February 2025",
    tag: "Launch",
    tagColor: "bg-[#FF3B3B]/10 text-[#FF3B3B]",
    items: [
      "TubeTarzan launches — YouTube viral intelligence platform",
      "VPH and outlier ratio calculations for every video",
      "Niche search with sorting and filtering",
      "Free, Creator, Pro, and Agency plans",
      "Google OAuth for YouTube channel connection",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <main className="bg-[#080808] min-h-screen">
      <Navbar />

      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-[#FFD200]/10 border border-[#FFD200]/20 text-[#FFD200] text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider mb-6">
            Changelog
          </div>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-white mb-4">
            What&apos;s new
          </h1>
          <p className="text-[#999999] text-lg">
            Every update, improvement, and fix — in order.
          </p>
        </div>

        <div className="space-y-10">
          {CHANGES.map((release) => (
            <div key={release.version} className="relative pl-6 border-l border-[#1E1E1E]">
              <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-[#FFD200]" />
              <div className="flex items-center gap-3 mb-4">
                <span className="font-display font-bold text-white text-lg">v{release.version}</span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${release.tagColor}`}>
                  {release.tag}
                </span>
                <span className="text-[#555555] text-sm">{release.date}</span>
              </div>
              <ul className="space-y-2.5">
                {release.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-[#999999]">
                    <span className="text-[#FFD200] mt-0.5 shrink-0">+</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
