"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { FAQS } from "@/lib/landing-content";

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
