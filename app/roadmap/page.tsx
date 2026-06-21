import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

export const metadata = {
  title: "Roadmap — TubeTarzan",
  description: "See what's coming next to TubeTarzan. Voted on by our creator community.",
};

const SHIPPED = [
  "Intelligence board with 200+ results, VPH, and outlier ratio",
  "18 viral title pattern searches",
  "Competitor channel analysis",
  "My Channel — connect and sync YouTube videos",
  "One-click apply title, description, and tags to YouTube",
  "Packaging Studio — 4-step AI title and thumbnail wizard",
  "Fix All — bulk video optimisation for Pro & Agency",
  "Idea tracker with AI generation",
  "Tag bank — save and reuse tag sets",
  "LemonSqueezy payment integration",
];

const IN_PROGRESS = [
  "AI support chat widget (Tarzan chat agent)",
  "Admin support inbox with conversation management",
  "Knowledge base manager for support automation",
];

const PLANNED = [
  "Thumbnail A/B test tracker",
  "Channel analytics dashboard (CTR, retention, revenue trends)",
  "Team collaboration seats (Agency plan)",
  "Scheduled niche scan digests via email",
  "Chrome extension — get VPH data directly on YouTube",
  "Mobile app (iOS & Android)",
  "API access for power users",
  "Video series planner (chain related viral topics)",
  "Niche research saved libraries",
  "Direct Canva thumbnail template integration",
];

export default function RoadmapPage() {
  return (
    <main className="bg-[#080808] min-h-screen">
      <Navbar />

      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-[#FFD200]/10 border border-[#FFD200]/20 text-[#FFD200] text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider mb-6">
            Roadmap
          </div>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-white mb-4">
            What we&apos;re building
          </h1>
          <p className="text-[#999999] text-lg">
            This is a live view of what&apos;s shipped, what&apos;s in progress, and what&apos;s coming next.
            Have a feature idea? Email{" "}
            <a href="mailto:support@tubetarzan.com" className="text-[#FFD200] hover:underline">
              support@tubetarzan.com
            </a>
            .
          </p>
        </div>

        {/* In Progress */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-5">
            <Loader2 className="w-4 h-4 text-[#FFB700] animate-spin" />
            <h2 className="font-display font-bold text-xl text-white">In Progress</h2>
            <span className="bg-[#FFB700]/10 text-[#FFB700] text-xs font-bold px-2.5 py-0.5 rounded-full">
              {IN_PROGRESS.length} items
            </span>
          </div>
          <div className="bg-[#111111] border border-[#FFB700]/20 rounded-2xl p-6 space-y-3">
            {IN_PROGRESS.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <Loader2 className="w-4 h-4 text-[#FFB700] mt-0.5 shrink-0 animate-spin" />
                <span className="text-white text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Planned */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-5">
            <Circle className="w-4 h-4 text-[#555555]" />
            <h2 className="font-display font-bold text-xl text-white">Planned</h2>
            <span className="bg-[#1E1E1E] text-[#555555] text-xs font-bold px-2.5 py-0.5 rounded-full">
              {PLANNED.length} items
            </span>
          </div>
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6 space-y-3">
            {PLANNED.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <Circle className="w-4 h-4 text-[#333333] mt-0.5 shrink-0" />
                <span className="text-[#999999] text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Shipped */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
            <h2 className="font-display font-bold text-xl text-white">Shipped</h2>
            <span className="bg-[#22C55E]/10 text-[#22C55E] text-xs font-bold px-2.5 py-0.5 rounded-full">
              {SHIPPED.length} items
            </span>
          </div>
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6 space-y-3">
            {SHIPPED.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-[#22C55E] mt-0.5 shrink-0" />
                <span className="text-[#555555] text-sm line-through decoration-[#333333]">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
