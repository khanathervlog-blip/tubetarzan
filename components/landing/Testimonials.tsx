import { Star } from "lucide-react";

const TESTIMONIALS = [
  {
    quote:
      "Found a 14x outlier idea in 90 seconds. Made the video. Hit 200K views. This paid for itself 50 times over in month one.",
    initials: "AK",
    name: "Ahmed K.",
    handle: "@SelfMasteryHub",
    subs: "67K subs",
  },
  {
    quote:
      "I spent 4 hours every Sunday on competitor research. Now I click one button and get better ideas in under a minute. Cancelled VidIQ the same day.",
    initials: "SM",
    name: "Sara M.",
    handle: "@IstanbulTravel",
    subs: "44K subs",
  },
  {
    quote:
      "The one-click title optimiser alone is worth the subscription. Three videos went from 800 views to 40K+ after applying the AI-suggested titles.",
    initials: "MT",
    name: "Marcus T.",
    handle: "@SeniorHealthNow",
    subs: "112K subs",
  },
];

export default function Testimonials() {
  return (
    <section className="py-20 lg:py-28 bg-[#080808]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] text-xs font-bold px-3 py-1.5 rounded-badge uppercase tracking-wider mb-6">
            Testimonials
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-white">
            WHAT CREATORS ARE SAYING
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={i}
              className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6 flex flex-col"
            >
              <div className="flex items-center gap-0.5 mb-4">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 text-[#FFD200] fill-[#FFD200]" />
                ))}
              </div>

              <blockquote className="text-white leading-relaxed mb-6 flex-1">
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              <div className="flex items-center gap-3 pt-4 border-t border-[#1E1E1E]">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF3B3B] to-[#FFD200] flex items-center justify-center text-[#080808] text-sm font-bold flex-shrink-0">
                  {t.initials}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{t.name}</p>
                  <p className="text-[#555555] text-xs">
                    {t.handle} · {t.subs}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
