"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    question: "Do I need a VidIQ subscription?",
    answer:
      "No. TubeTarzan uses YouTube's official free API — the same data source VidIQ uses — at a fraction of the price.",
  },
  {
    question: "What is the YouTube API key I need to provide?",
    answer:
      "On Free and Creator plans, you bring your own free Google API key. It takes 5 minutes to get from Google Cloud Console, and we show you exactly how inside the app with screenshots. Your key = your 10,000 free units per day. Pro and Agency users never touch this — we handle it completely.",
  },
  {
    question: "Can I use one subscription for multiple channels?",
    answer:
      "Each subscription locks to one YouTube channel. Agency plan supports up to 5 channels. This keeps prices low for everyone.",
  },
  {
    question: "How is VPH calculated?",
    answer:
      "Views Per Hour = Total Views ÷ Hours Since Upload. Fetched live from YouTube every scan. Shows you what is gaining momentum RIGHT NOW.",
  },
  {
    question: "What is the 14x Outlier Ratio?",
    answer:
      "A video's views divided by the channel's average views per video. 14x means that video got 14 times more views than normal for that channel — a strong viral signal.",
  },
  {
    question: "Can I change my locked YouTube channel?",
    answer:
      "Yes, once every 90 days. Contact support and we process it within 24 hours.",
  },
  {
    question: "How does the one-click apply work?",
    answer:
      "We use YouTube's official write API with your permission. You always review AI suggestions before anything changes on your channel — nothing is automatic.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "Yes. Free plan is free forever with no card. All paid plans have a 7-day free trial. No credit card required to start.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="py-20 lg:py-28 bg-[#080808]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 text-[#FF3B3B] text-xs font-bold px-3 py-1.5 rounded-badge uppercase tracking-wider mb-6">
            FAQ
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white">
            FREQUENTLY ASKED QUESTIONS
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className="bg-[#111111] border border-[#1E1E1E] rounded-card overflow-hidden"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left min-h-[60px]"
                aria-expanded={open === i}
              >
                <span className="font-medium text-white text-sm sm:text-base">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-[#555555] flex-shrink-0 transition-transform duration-200 ${
                    open === i ? "rotate-180" : ""
                  }`}
                />
              </button>

              {open === i && (
                <div className="px-6 pb-5 border-t border-[#1E1E1E] pt-4">
                  <p className="text-[#999999] leading-relaxed text-sm sm:text-base">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
