import { Mail, ExternalLink, Send } from "lucide-react";

const EMAIL_SEQUENCES = [
  {
    name: "Free Signup Sequence",
    trigger: "On free signup",
    emails: [
      "Welcome — get your first viral idea in 60 seconds",
      "Day 1: Your free scan is waiting",
      "Day 3: See the other 200+ results [upgrade]",
      "Day 5: Case study — 14x idea in 90 seconds",
      "Day 7: Special offer — 50% off first month",
      "Day 14: Still on free? Here's what you're missing",
    ],
  },
  {
    name: "Trial Started Sequence",
    trigger: "On paid trial start",
    emails: [
      "Your trial is live — 3 things to do today",
      "Day 2: Have you done your first intelligence scan?",
      "Day 5: Your trial is halfway through",
      "Day 6: Trial ends tomorrow",
      "Day 7: You're now a full member",
    ],
  },
  {
    name: "Payment Failed Sequence",
    trigger: "On payment failure",
    emails: [
      "Action needed: your payment failed",
      "Day 2: Your account will be paused in 24 hours",
      "Day 3: Account paused — click to reactivate",
    ],
  },
  {
    name: "Cancellation Win-Back",
    trigger: "On subscription cancel",
    emails: [
      "We're sorry to see you go",
      "Day 3: Was it the price? 30% off for 3 months",
      "Day 14: New feature launched — come back free",
      "Day 30: Your channel data is still saved",
    ],
  },
];

export default function AdminEmailsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-white mb-1">
          Email Sequences
        </h1>
        <p className="text-[#555500] text-sm">
          Managed via Loops.so. Edit templates there, stats shown here.
        </p>
      </div>

      {/* Sequences */}
      <div className="space-y-4 mb-10">
        {EMAIL_SEQUENCES.map((seq) => (
          <div
            key={seq.name}
            className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-white text-sm">{seq.name}</h3>
                <p className="text-[#555555] text-xs mt-0.5">
                  Trigger: {seq.trigger}
                </p>
              </div>
              <a
                href="https://app.loops.so"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[#555555] hover:text-white text-xs transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Edit in Loops
              </a>
            </div>
            <div className="space-y-1.5">
              {seq.emails.map((email, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-xs text-[#999999]"
                >
                  <span className="text-[#333333] font-mono-stats w-6">
                    {i + 1}.
                  </span>
                  <span>{email}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Broadcast */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Send className="w-4 h-4 text-[#FFD200]" />
          <h2 className="font-semibold text-white text-sm">Broadcast Email</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#999999] mb-2">
              Segment
            </label>
            <select className="w-full bg-[#080808] border border-[#1E1E1E] text-white rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200] min-h-[44px]">
              <option>All Users</option>
              <option>Free Plan</option>
              <option>Creator Plan</option>
              <option>Pro Plan</option>
              <option>Agency Plan</option>
              <option>Trial Users</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#999999] mb-2">
              Subject
            </label>
            <input
              type="text"
              placeholder="Email subject line..."
              className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200] transition-colors min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#999999] mb-2">
              Body
            </label>
            <textarea
              rows={6}
              placeholder="Write your broadcast message..."
              className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200] transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button className="flex items-center gap-2 bg-[#111111] border border-[#333333] text-white text-sm px-5 py-3 rounded-btn hover:border-[#555555] transition-colors min-h-[44px]">
              <Mail className="w-4 h-4" />
              Send Test
            </button>
            <button className="flex items-center gap-2 bg-[#FFD200] text-[#080808] font-bold text-sm px-5 py-3 rounded-btn hover:bg-[#FFE033] transition-colors min-h-[44px]">
              <Send className="w-4 h-4" />
              Send Broadcast
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
