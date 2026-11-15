import { Check, Minus } from "lucide-react";
import { PLAN_PRICES } from "@/lib/plans";

const ROWS: { feature: string; us: string; others: string; usYes?: boolean }[] = [
  { feature: "Find proven video ideas (views-per-hour and outlier scores)", us: "Yes - scans 200+ videos in 60 seconds", others: "Mostly keyword and SEO scores", usYes: true },
  { feature: "Script, AI voiceover and free B-roll", us: "Included", others: "Usually a separate tool or a higher tier", usYes: true },
  { feature: "Captions from Hindi / Urdu / English speech", us: "Free, runs in your browser", others: "Usually a separate tool", usYes: true },
  { feature: "Translate captions into many languages", us: "5, 9 or 20 languages per video by plan", others: "Usually a separate tool", usYes: true },
  { feature: "A/B title testing and bulk updates", us: "Included", others: "Often on higher tiers", usYes: true },
  { feature: "Free plan without a card", us: "Yes", others: "Limited free tier", usYes: true },
  { feature: "Multiple channels", us: "Up to 5 on Agency", others: "Often limited or counted as a business plan", usYes: true },
  { feature: "Price of full-featured plans", us: `From $${PLAN_PRICES.creator.monthly}/month`, others: "Commonly $30-$50+ per month", usYes: true },
];

/** Honest, unnamed comparison against "typical" keyword/analytics extensions (based on public pricing pages, 2026). */
export default function Comparison() {
  return (
    <section id="compare" className="py-20 lg:py-24 bg-[#080808] scroll-mt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-[#FFD200] text-xs font-bold uppercase tracking-widest mb-4">How we compare</p>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white">TubeTarzan vs typical YouTube SEO &amp; analytics tools</h2>
        </div>
        <div className="overflow-x-auto rounded-card border border-[#1E1E1E]">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="bg-[#111111] text-left">
                <th className="p-4 text-[#999999] font-medium">What you need</th>
                <th className="p-4 text-[#FFD200] font-bold">TubeTarzan</th>
                <th className="p-4 text-[#999999] font-medium">Typical SEO / analytics extension</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.feature} className="border-t border-[#1E1E1E]">
                  <td className="p-4 text-white">{r.feature}</td>
                  <td className="p-4 text-[#E5E5E5]"><span className="inline-flex items-start gap-2"><Check className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />{r.us}</span></td>
                  <td className="p-4 text-[#999999]"><span className="inline-flex items-start gap-2"><Minus className="w-4 h-4 text-[#666] mt-0.5 shrink-0" />{r.others}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[#666] text-xs mt-3">Based on publicly listed features and prices of popular tools in 2026. Plans change - check current details before you decide.</p>
      </div>
    </section>
  );
}
