"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Zap, Loader2 } from "lucide-react";

const PLANS = [
  {
    name: "Free",
    price: { monthly: 0, annual: 0 },
    description: "Try TubeTarzan risk-free",
    cta: "Get Started Free",
    ctaHref: "/signup",
    featured: false,
    features: [
      "1 channel (read-only)",
      "3 scans / day",
      "Top 10 results only",
      "Bring own API key",
      "3 competitors",
      "Idea tracker",
    ],
  },
  {
    name: "Creator",
    price: { monthly: 9, annual: 79 },
    annualNote: "$6.58/month",
    description: "For creators serious about growth",
    cta: "Start Free Trial",
    ctaHref: "/signup?plan=creator",
    featured: true,
    features: [
      "1 channel (full)",
      "3 scans / day",
      "All 200+ results",
      "Bring own API key",
      "5 competitors",
      "Idea tracker",
      "Tag copy",
      "One-click apply",
      "Packaging studio",
    ],
  },
  {
    name: "Pro",
    price: { monthly: 25, annual: 228 },
    annualNote: "$19/month",
    description: "For full-time YouTube operators",
    cta: "Start Free Trial",
    ctaHref: "/signup?plan=pro",
    featured: false,
    features: [
      "1 channel (full)",
      "Unlimited scans",
      "All 200+ results",
      "We handle API key",
      "10 competitors",
      "Idea tracker",
      "Tag copy",
      "One-click apply",
      "Packaging studio",
      "Bulk video update",
    ],
  },
];

const AGENCY_PLAN = {
  name: "Agency",
  price: { monthly: 99, annual: 950 },
  annualNote: "$79.16/month",
  description: "For agencies managing multiple channels",
  cta: "Start Free Trial",
  ctaHref: "/signup?plan=agency",
  features: [
    "5 YouTube channels",
    "Everything in Pro ×5",
    "We handle all API keys",
    "2 team seats",
    "Unlimited competitors",
    "Priority support",
  ],
};

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  async function handleUpgrade(plan: string) {
    setLoadingPlan(plan);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, period: annual ? "annual" : "monthly" }),
      });
      if (res.status === 401) {
        window.location.href = `/login?redirect=/pricing`;
        return;
      }
      const data = await res.json() as { checkoutUrl?: string; error?: string };
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <section id="pricing" className="py-20 lg:py-28 bg-[#080808]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-[#FFD200]/10 border border-[#FFD200]/20 text-[#FFD200] text-xs font-bold px-3 py-1.5 rounded-badge uppercase tracking-wider mb-6">
            Pricing
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-white mb-4">
            SIMPLE, TRANSPARENT PRICING
          </h2>
          <p className="text-[#999999] text-lg mb-8">
            Start free. Upgrade when you&apos;re ready.
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-3 bg-[#111111] border border-[#1E1E1E] rounded-full p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                !annual
                  ? "bg-[#FFD200] text-[#080808]"
                  : "text-[#999999] hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                annual
                  ? "bg-[#FFD200] text-[#080808]"
                  : "text-[#999999] hover:text-white"
              }`}
            >
              Annual
              <span className="ml-2 bg-[#22C55E]/20 text-[#22C55E] text-xs px-1.5 py-0.5 rounded-badge">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Main 3 plans */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-card p-6 lg:p-8 flex flex-col ${
                plan.featured
                  ? "bg-[#111111] border-2 border-[#FFD200]"
                  : "bg-[#111111] border border-[#1E1E1E]"
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-[#FFD200] text-[#080808] text-xs font-bold px-4 py-1 rounded-full">
                    ★ Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-display font-bold text-xl text-white mb-1">
                  {plan.name}
                </h3>
                <p className="text-[#555555] text-sm mb-4">{plan.description}</p>

                <div className="flex items-end gap-1">
                  <span className="font-display font-extrabold text-4xl text-white">
                    ${annual ? Math.floor(plan.price.annual / 12) : plan.price.monthly}
                  </span>
                  {plan.price.monthly > 0 && (
                    <span className="text-[#555555] text-sm mb-1">/month</span>
                  )}
                  {plan.price.monthly === 0 && (
                    <span className="text-[#555555] text-sm mb-1">forever</span>
                  )}
                </div>
                {annual && plan.annualNote && (
                  <p className="text-[#555555] text-xs mt-1">
                    ${plan.price.annual}/year · {plan.annualNote}
                  </p>
                )}
                {!annual && plan.price.monthly > 0 && (
                  <p className="text-[#555555] text-xs mt-1">
                    billed monthly
                  </p>
                )}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <Check className="w-4 h-4 text-[#22C55E] flex-shrink-0 mt-0.5" />
                    <span className="text-[#999999]">{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.price.monthly === 0 ? (
                <Link
                  href={plan.ctaHref}
                  className="w-full py-3 rounded-btn font-bold text-sm text-center transition-colors block min-h-[44px] flex items-center justify-center bg-transparent border border-[#333333] text-white hover:border-[#555555]"
                >
                  {plan.cta}
                </Link>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.name.toLowerCase())}
                  disabled={loadingPlan === plan.name.toLowerCase()}
                  className={`w-full py-3 rounded-btn font-bold text-sm text-center transition-colors min-h-[44px] flex items-center justify-center gap-2 disabled:opacity-70 ${
                    plan.featured
                      ? "bg-[#FFD200] text-[#080808] hover:bg-[#FFE033]"
                      : "bg-transparent border border-[#333333] text-white hover:border-[#555555]"
                  }`}
                >
                  {loadingPlan === plan.name.toLowerCase() ? <Loader2 className="w-4 h-4 animate-spin" /> : plan.cta}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Agency plan */}
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6 lg:p-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-[#FF3B3B]/10 text-[#FF3B3B] text-xs font-bold px-3 py-1 rounded-badge mb-3">
                <Zap className="w-3 h-3" />
                Agency
              </div>
              <h3 className="font-display font-bold text-2xl text-white mb-2">
                {AGENCY_PLAN.name}
              </h3>
              <p className="text-[#555555] text-sm">{AGENCY_PLAN.description}</p>
            </div>

            <div className="flex items-end gap-1">
              <span className="font-display font-extrabold text-4xl text-white">
                ${annual ? Math.floor(AGENCY_PLAN.price.annual / 12) : AGENCY_PLAN.price.monthly}
              </span>
              <span className="text-[#555555] text-sm mb-1">/month</span>
              {annual && (
                <span className="text-[#555555] text-xs ml-2 mb-1">
                  (${AGENCY_PLAN.price.annual}/yr)
                </span>
              )}
            </div>

            <div className="md:col-span-2 lg:col-span-1">
              <ul className="grid grid-cols-2 gap-2 mb-6">
                {AGENCY_PLAN.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-[#22C55E] flex-shrink-0 mt-0.5" />
                    <span className="text-[#999999]">{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleUpgrade("agency")}
                disabled={loadingPlan === "agency"}
                className="bg-transparent border border-[#333333] text-white font-bold text-sm px-6 py-3 rounded-btn hover:border-[#555555] transition-colors block text-center min-h-[44px] flex items-center justify-center gap-2 disabled:opacity-70 w-full"
              >
                {loadingPlan === "agency" ? <Loader2 className="w-4 h-4 animate-spin" /> : AGENCY_PLAN.cta}
              </button>
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-[#555555]">
          {[
            "✓ No credit card for free plan",
            "✓ 7-day free trial on all paid plans",
            "✓ Cancel anytime",
            "✓ Setup in 5 minutes",
          ].map((item, i) => (
            <span key={i} className="text-[#999999]">
              {item}
            </span>
          ))}
        </div>

        {/* VidIQ comparison */}
        <div className="mt-8 text-center">
          <p className="text-[#555555] text-sm">
            VidIQ charges $49/month for their Boost plan.{" "}
            <span className="text-[#999999]">
              TubeTarzan Pro gives you more — for $25/month. No annual lock-in required.
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
