import { Search, Zap, Video } from "lucide-react";

const STEPS = [
  {
    number: "01",
    icon: Search,
    title: "Enter Your Niche",
    description:
      "Type any niche. Travel, health, self-improvement, stories — anything. One click runs the full intelligence scan.",
  },
  {
    number: "02",
    icon: Zap,
    title: "Get Your Intel",
    description:
      "TubeTarzan searches YouTube, calculates VPH and outlier ratios, and surfaces 200+ ranked viral opportunities with AI-packaged ideas.",
  },
  {
    number: "03",
    icon: Video,
    title: "Optimise & Upload",
    description:
      "Connect your channel. AI rewrites your titles, descriptions, and tags. Apply to YouTube in one click. No Studio hunting. No copy-paste.",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-20 lg:py-28 bg-[#080808]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-[#FFD200]/10 border border-[#FFD200]/20 text-[#FFD200] text-xs font-bold px-3 py-1.5 rounded-badge uppercase tracking-wider mb-6">
            How It Works
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-white">
            FROM NICHE TO VIRAL IDEA
            <br />
            IN 3 STEPS
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="relative">
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[calc(100%-0px)] w-full h-px bg-gradient-to-r from-[#FFD200]/30 to-transparent z-0" />
                )}

                <div className="relative bg-[#111111] border border-[#1E1E1E] rounded-card p-6 lg:p-8 hover:border-[#333333] transition-colors">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="font-mono-stats text-[#FFD200] text-4xl font-bold">
                      {step.number}
                    </span>
                  </div>

                  <div className="w-12 h-12 bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 rounded-card flex items-center justify-center mb-5">
                    <Icon className="w-6 h-6 text-[#FF3B3B]" />
                  </div>

                  <h3 className="font-display font-bold text-xl text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-[#999999] leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
