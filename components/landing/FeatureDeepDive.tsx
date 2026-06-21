import { ArrowUpDown, CheckCircle, ListTodo } from "lucide-react";

function IntelligenceBoardMockup() {
  const rows = [
    { title: "Dark Side of Self Mastery", vph: 847, outlier: 14.2, views: "2.1M" },
    { title: "Why Discipline Fails After 30", vph: 634, outlier: 11.7, views: "1.8M" },
    { title: "The Hustle Culture Lie", vph: 1203, outlier: 19.8, views: "3.2M" },
    { title: "Morning Routine That Actually Works", vph: 412, outlier: 7.3, views: "940K" },
  ];

  return (
    <div className="bg-[#080808] rounded-card border border-[#1E1E1E] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1E1E1E] bg-[#0D0D0D]">
        <div className="w-3 h-3 rounded-full bg-[#FF3B3B]/50" />
        <div className="w-3 h-3 rounded-full bg-[#FFD200]/50" />
        <div className="w-3 h-3 rounded-full bg-[#22C55E]/50" />
        <span className="text-[#555555] text-xs ml-2 font-mono-stats">viral-intelligence-board</span>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[#555555] text-xs font-mono-stats">Niche: self mastery</span>
          <span className="ml-auto bg-[#22C55E]/10 text-[#22C55E] text-xs px-2 py-0.5 rounded-badge font-mono-stats">212 videos found</span>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[#555555] border-b border-[#1E1E1E]">
              <th className="text-left pb-2 font-medium">Title</th>
              <th className="text-right pb-2 font-medium flex items-center justify-end gap-1">
                VPH <ArrowUpDown className="w-3 h-3" />
              </th>
              <th className="text-right pb-2 font-medium">Outlier</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={`border-b border-[#0F0F0F] ${i === 2 ? "bg-[#FFD200]/5" : ""}`}>
                <td className="py-2 pr-2 text-white truncate max-w-[140px]">{row.title}</td>
                <td className="py-2 text-right font-mono-stats text-[#FFD200] font-bold">{row.vph}</td>
                <td className="py-2 text-right">
                  <span className={`font-mono-stats font-bold ${row.outlier >= 14 ? "text-[#FF3B3B]" : "text-[#999999]"}`}>
                    {row.outlier}x
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChannelOptimizerMockup() {
  const videos = [
    { title: "My Morning Routine", score: 34, suggested: "My 5AM Morning Routine Changed Everything" },
    { title: "How to Be Productive", score: 67, suggested: "Do This Every Morning to 10x Your Productivity" },
    { title: "Focus Tips", score: 22, suggested: "I Tested 30 Focus Techniques — These 3 Work" },
  ];

  return (
    <div className="bg-[#080808] rounded-card border border-[#1E1E1E] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1E1E1E] bg-[#0D0D0D]">
        <span className="text-[#555555] text-xs font-mono-stats">channel-optimizer · @YourChannel</span>
      </div>
      <div className="p-4 space-y-3">
        {videos.map((v, i) => (
          <div key={i} className="bg-[#111111] border border-[#1E1E1E] rounded-badge p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white text-xs truncate max-w-[160px]">{v.title}</span>
              <span className={`font-mono-stats text-xs font-bold px-2 py-0.5 rounded-badge ${
                v.score < 40 ? "bg-[#FF3B3B]/10 text-[#FF3B3B]" :
                v.score < 70 ? "bg-[#FFD200]/10 text-[#FFD200]" :
                "bg-[#22C55E]/10 text-[#22C55E]"
              }`}>{v.score}/100</span>
            </div>
            <p className="text-[#555555] text-xs mb-2">→ <span className="text-[#FFD200]">{v.suggested}</span></p>
            <button className="text-xs bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 text-[#FF3B3B] px-3 py-1 rounded-badge hover:bg-[#FF3B3B]/20 transition-colors">
              Apply to YouTube
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TitleScorerMockup() {
  return (
    <div className="bg-[#080808] rounded-card border border-[#1E1E1E] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1E1E1E] bg-[#0D0D0D]">
        <span className="text-[#555555] text-xs font-mono-stats">packaging-studio</span>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-center mb-4">
          <div className="relative w-24 h-24">
            <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
              <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#1E1E1E" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.9155" fill="none"
                stroke="#FF3B3B" strokeWidth="3"
                strokeDasharray="94, 100"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="font-mono-stats text-white font-bold text-2xl">94</span>
              <span className="text-[#555555] text-xs">/100</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {[
            { label: "Title", value: "Dark Side of Self Mastery", ok: true },
            { label: "Thumbnail", value: "THEY LIED TO YOU", ok: true },
            { label: "Hook", value: "What if everything you've...", ok: true },
            { label: "Click Confirmation", value: "Backed by 3 studies", ok: true },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <CheckCircle className="w-3.5 h-3.5 text-[#22C55E] flex-shrink-0" />
              <span className="text-[#555555] w-24 flex-shrink-0">{item.label}</span>
              <span className="text-white truncate">{item.value}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-badge px-3 py-2">
          <p className="text-[#22C55E] text-xs font-bold">✓ Score 90+. Ready to record.</p>
        </div>
      </div>
    </div>
  );
}

function IdeaTrackerMockup() {
  const ideas = [
    { title: "Dark Side of Self Mastery", status: "Scripting", color: "#FFD200" },
    { title: "Morning Routine That Breaks Rules", status: "Recorded", color: "#FF3B3B" },
    { title: "Why Hustle Culture Is Failing You", status: "Pending", color: "#555555" },
    { title: "The 5AM Club — Real Results", status: "Uploaded", color: "#22C55E" },
  ];

  return (
    <div className="bg-[#080808] rounded-card border border-[#1E1E1E] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1E1E1E] bg-[#0D0D0D] flex items-center gap-2">
        <ListTodo className="w-3.5 h-3.5 text-[#555555]" />
        <span className="text-[#555555] text-xs font-mono-stats">idea-tracker · 4 ideas</span>
      </div>
      <div className="p-4 space-y-3">
        {ideas.map((idea, i) => (
          <div key={i} className="flex items-center gap-3 bg-[#111111] border border-[#1E1E1E] rounded-badge p-3">
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{idea.title}</p>
            </div>
            <span
              className="text-xs font-mono-stats font-bold px-2 py-0.5 rounded-badge flex-shrink-0"
              style={{ color: idea.color, background: `${idea.color}15`, border: `1px solid ${idea.color}30` }}
            >
              {idea.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const FEATURES = [
  {
    badge: "Intelligence Board",
    title: "The Viral Signal Engine VidIQ Wished They Built",
    description: `We calculate Views Per Hour (VPH) and the 14x Outlier Ratio — the two signals that separate viral videos from average ones.

Sort 200+ videos by VPH to see what is gaining momentum RIGHT NOW. Sort by Outlier Ratio to find what massively outperformed its channel. Filter by sub-niche. Click any row. Copy tags in one click.

This is not a list of AI guesses. This is real YouTube data, live.`,
    mockup: <IntelligenceBoardMockup />,
    reverse: false,
  },
  {
    badge: "Channel Optimiser",
    title: "Your Existing Videos Are Leaving Money on the Table",
    description: `Connect your YouTube channel. TubeTarzan scans every video you have uploaded, scores each one 0–100, and tells you which to fix first. AI then rewrites the title, description, and tags.

You review. You click Apply. Changes go live on YouTube in 60 seconds.`,
    mockup: <ChannelOptimizerMockup />,
    reverse: true,
  },
  {
    badge: "Packaging Studio",
    title: "The Masterclass Packaging Formula — Automated",
    description: `Title → Thumbnail Text → Hook → Click Confirmation.

The four elements that determine if your video gets clicked or ignored. TubeTarzan walks you through each one and scores your packaging before you spend a single minute on production.

Score above 90? You are ready to record.`,
    mockup: <TitleScorerMockup />,
    reverse: false,
  },
  {
    badge: "Idea Tracker",
    title: "Your Content Pipeline — Finally Organised",
    description: `Every viral idea you find is saved. Move ideas through your pipeline: Pending → Scripting → Recorded → Uploaded → Done.

Never lose a good idea again. Never wonder what to make next.`,
    mockup: <IdeaTrackerMockup />,
    reverse: true,
  },
];

export default function FeatureDeepDive() {
  return (
    <section id="features" className="py-20 lg:py-28 bg-[#080808]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 text-[#FF3B3B] text-xs font-bold px-3 py-1.5 rounded-badge uppercase tracking-wider mb-6">
            Features
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-white">
            EVERYTHING YOU NEED TO
            <br />
            DOMINATE YOUR NICHE
          </h2>
        </div>

        <div className="space-y-24">
          {FEATURES.map((feature, i) => (
            <div
              key={i}
              className={`grid lg:grid-cols-2 gap-12 lg:gap-16 items-center ${
                feature.reverse ? "lg:grid-flow-dense" : ""
              }`}
            >
              <div className={feature.reverse ? "lg:col-start-2" : ""}>
                <div className="inline-flex items-center gap-2 bg-[#FFD200]/10 border border-[#FFD200]/20 text-[#FFD200] text-xs font-bold px-3 py-1.5 rounded-badge uppercase tracking-wider mb-6">
                  {feature.badge}
                </div>
                <h3 className="font-display font-bold text-2xl sm:text-3xl text-white mb-5 leading-tight">
                  {feature.title}
                </h3>
                <div className="space-y-4">
                  {feature.description.split("\n\n").map((para, j) => (
                    <p key={j} className="text-[#999999] leading-relaxed">
                      {para}
                    </p>
                  ))}
                </div>
              </div>
              <div className={feature.reverse ? "lg:col-start-1 lg:row-start-1" : ""}>
                {feature.mockup}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
