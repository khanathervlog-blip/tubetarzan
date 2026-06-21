const TICKER_ITEMS = [
  "⚡ Channel grew 0→82K in 4 months",
  "🔥 14x outlier idea found in 90 seconds",
  "💡 First viral video at 38 subscribers",
  "💰 Replaced VidIQ and saved $480/year",
  "🚀 100K subscribers in 5 months",
  "⚡ Hit 200K views from one TubeTarzan idea",
  "📈 3x channel growth in 60 days",
  "🎯 Found a 19x outlier on first scan",
];

export default function SocialProofTicker() {
  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div className="bg-[#0A0A0A] border-y border-[#1E1E1E] py-4 overflow-hidden">
      <div className="ticker-wrapper">
        <div className="ticker-content">
          {doubled.map((item, i) => (
            <span key={i} className="inline-flex items-center">
              <span className="text-[#FFD200] font-medium text-sm whitespace-nowrap px-8">
                {item}
              </span>
              <span className="text-[#333333] text-sm">·</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
