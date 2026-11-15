import { PLAN_PRICES, CHANNEL_LIMIT, CAPTION_LANGUAGE_LIMIT } from "@/lib/plans";

// Competitor facts come ONLY from their official pricing pages (vidiq.com/pricing, tubebuddy.com/pricing), checked 15 Nov 2026.
// "Not listed" means the feature is not mentioned on that pricing page - it does not claim the tool lacks it.
const CHECKED = "15 Nov 2026";

const ROWS: { feature: string; us: string; vidiq: string; tb: string }[] = [
  {
    feature: "Paid plans (per month)",
    us: `Creator $${PLAN_PRICES.creator.monthly} · Pro $${PLAN_PRICES.pro.monthly} · Agency $${PLAN_PRICES.agency.monthly}`,
    vidiq: "Boost $19 · MAX $49 (or $16.58 / $39 billed yearly)",
    tb: "Pro and Legend - price shown at checkout",
  },
  { feature: "Free plan", us: "Yes, no card needed", vidiq: "Yes (150 AI credits a month)", tb: "No free plan card on the pricing page" },
  {
    feature: "Channels per plan",
    us: `${CHANNEL_LIMIT.creator} on Creator and Pro, ${CHANNEL_LIMIT.agency} on Agency`,
    vidiq: "Prices are per channel; Enterprise for 3+ channels",
    tb: "One channel per license, individual creators only",
  },
  { feature: "AI usage", us: "Fair-use plan limits", vidiq: "Monthly AI credit packs (2,000 on Boost, 6,000 on MAX)", tb: "AI features on Legend" },
  { feature: "A/B title testing", us: "Included on paid plans", vidiq: "Not listed", tb: "Legend plan" },
  { feature: "Script, AI voiceover and free B-roll", us: "Included", vidiq: "Script writer (uses AI credits); voiceover not listed", tb: "Not listed" },
  {
    feature: "Captions in Hindi / Urdu / English, translated",
    us: `Free to create; translate to ${CAPTION_LANGUAGE_LIMIT.creator} / ${CAPTION_LANGUAGE_LIMIT.pro} / ${CAPTION_LANGUAGE_LIMIT.agency} languages`,
    vidiq: "Not listed",
    tb: "Not listed",
  },
];

export default function Comparison() {
  return (
    <section id="compare" className="py-20 lg:py-24 bg-[#080808] scroll-mt-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-[#FFD200] text-xs font-bold uppercase tracking-widest mb-4">How we compare</p>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white">TubeTarzan vs vidIQ and TubeBuddy</h2>
        </div>
        <div className="overflow-x-auto rounded-card border border-[#1E1E1E]">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="bg-[#111111] text-left">
                <th className="p-4 text-[#999999] font-medium">What you need</th>
                <th className="p-4 text-[#FFD200] font-bold">TubeTarzan</th>
                <th className="p-4 text-[#999999] font-medium">vidIQ</th>
                <th className="p-4 text-[#999999] font-medium">TubeBuddy</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.feature} className="border-t border-[#1E1E1E] align-top">
                  <td className="p-4 text-white">{r.feature}</td>
                  <td className="p-4 text-[#E5E5E5]">{r.us}</td>
                  <td className="p-4 text-[#999999]">{r.vidiq}</td>
                  <td className="p-4 text-[#999999]">{r.tb}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[#666] text-xs mt-3">
          Competitor details are taken from their public pricing pages, checked {CHECKED}. &ldquo;Not listed&rdquo; means the feature is not mentioned on that page. Plans and prices change - always check their sites. All trademarks belong to their owners; TubeTarzan is not affiliated with them.
        </p>
      </div>
    </section>
  );
}
