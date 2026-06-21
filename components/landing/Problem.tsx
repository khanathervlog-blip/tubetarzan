import { X, Check } from "lucide-react";

const PAINS = [
  "Opening 10 competitor channels one by one",
  "Calculating VPH by hand in a spreadsheet",
  "Guessing which title pattern actually works",
  "Rewriting video descriptions one by one",
  "Paying $49/month for VidIQ features you never use",
];

export default function Problem() {
  return (
    <section className="py-20 lg:py-28" style={{ background: "#0D0505" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 text-[#FF3B3B] text-xs font-bold px-3 py-1.5 rounded-badge uppercase tracking-wider mb-6">
              The Problem
            </div>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-white leading-tight mb-6">
              STOP SPENDING 6 HOURS ON RESEARCH THAT SHOULD TAKE 60 SECONDS.
            </h2>
            <p className="text-[#999999] text-lg leading-relaxed">
              Every successful YouTube automation creator knows the formula:
              find what is viral in your niche, reverse-engineer it, package
              it better than anyone else.
            </p>
            <p className="text-[#999999] text-lg leading-relaxed mt-4">
              But doing it manually means:
            </p>
          </div>

          {/* Right — pain list */}
          <div className="space-y-4">
            {PAINS.map((pain, i) => (
              <div
                key={i}
                className="flex items-start gap-4 bg-[#111111] border border-[#1E1E1E] rounded-card p-4"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 flex items-center justify-center mt-0.5">
                  <X className="w-4 h-4 text-[#FF3B3B]" />
                </div>
                <p className="text-white font-medium leading-relaxed">{pain}</p>
              </div>
            ))}

            {/* The solution teaser */}
            <div className="flex items-start gap-4 bg-[#FFD200]/5 border border-[#FFD200]/20 rounded-card p-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#FFD200]/20 border border-[#FFD200]/30 flex items-center justify-center mt-0.5">
                <Check className="w-4 h-4 text-[#FFD200]" />
              </div>
              <p className="text-[#FFD200] font-medium leading-relaxed">
                TubeTarzan does all of this in 60 seconds
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
