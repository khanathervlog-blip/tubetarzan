"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Check,
  Loader2,
  Zap,
  Video,
  Key,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import type { Profile } from "@/types/database";

const STEPS = ["Welcome", "Choose Plan", "API Key", "Connect Channel"];

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    features: ["3 scans/day", "Top 10 results", "Bring own API key"],
    cta: "Continue Free",
    variantEnv: null,
  },
  {
    id: "creator",
    name: "Creator",
    price: "$9",
    period: "/month",
    features: ["3 scans/day", "All 200+ results", "Bring own API key"],
    cta: "Start Trial",
    variantEnv: "LEMONSQUEEZY_CREATOR_MONTHLY_VARIANT_ID",
    featured: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$25",
    period: "/month",
    features: ["Unlimited scans", "All 200+ results", "We handle API key"],
    cta: "Start Trial",
    variantEnv: "LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID",
  },
  {
    id: "agency",
    name: "Agency",
    price: "$99",
    period: "/month",
    features: ["5 channels", "Unlimited scans", "Priority support"],
    cta: "Start Trial",
    variantEnv: "LEMONSQUEEZY_AGENCY_MONTHLY_VARIANT_ID",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // On mount, jump to the step indicated in the URL (e.g. after OAuth callback returns ?step=3)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("step");
    if (s) setStep(Math.min(parseInt(s) || 0, 3));
  }, []);
  const [selectedPlan, setSelectedPlan] = useState<string>("free");
  const [apiKey, setApiKey] = useState("");
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [apiKeyError, setApiKeyError] = useState("");
  const [apiKeyVerified, setApiKeyVerified] = useState(false);
  const [channelLoading, setChannelLoading] = useState(false);
  const [finishLoading, setFinishLoading] = useState(false);
  const [tutorialVideoUrl, setTutorialVideoUrl] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "onboarding_api_key_video")
      .single()
      .then(({ data }) => {
        if (data?.value) setTutorialVideoUrl(data.value);
      });
  }, []);

  async function handlePlanSelect(planId: string) {
    setSelectedPlan(planId);
    if (planId === "free") {
      setStep(2);
      return;
    }

    // Redirect to checkout for paid plans
    const res = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: planId }),
    });

    if (res.ok) {
      const { checkoutUrl } = await res.json();
      window.open(checkoutUrl, "_blank");
      // Polling — user comes back after paying
      setStep(2);
    }
  }

  async function verifyApiKey() {
    if (!apiKey.trim()) return;
    setApiKeyLoading(true);
    setApiKeyError("");

    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=dQw4w9WgXcQ&key=${apiKey.trim()}`
      );
      if (!res.ok) {
        setApiKeyError("API key is invalid. Please check and try again.");
        setApiKeyLoading(false);
        return;
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({
            youtube_api_key: apiKey.trim(),
            youtube_api_key_verified: true,
            api_key_setup_completed: true,
          } as Partial<Profile>)
          .eq("id", user.id);
      }

      setApiKeyVerified(true);
    } catch {
      setApiKeyError("Could not verify key. Please try again.");
    }

    setApiKeyLoading(false);
  }

  async function connectYouTube() {
    setChannelLoading(true);
    // OAuth redirect — handled in callback route
    window.location.href = "/api/auth/youtube/connect";
  }

  async function finishOnboarding() {
    setFinishLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true } as Partial<Profile>)
        .eq("id", user.id);
    }
    router.push("/dashboard");
  }

  const isPaidPlan =
    selectedPlan === "pro" || selectedPlan === "agency";

  return (
    <div className="w-full max-w-2xl">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < step
                    ? "bg-[#22C55E] text-white"
                    : i === step
                    ? "bg-[#FFD200] text-[#080808]"
                    : "bg-[#1E1E1E] text-[#555555]"
                }`}
              >
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span
                className={`text-xs hidden sm:block ${
                  i === step ? "text-white" : "text-[#555555]"
                }`}
              >
                {s}
              </span>
            </div>
          ))}
        </div>
        <div className="h-1 bg-[#1E1E1E] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#FFD200] rounded-full transition-all duration-500"
            style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-8">
        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-[#FFD200]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Zap className="w-8 h-8 text-[#FFD200]" />
            </div>
            <h1 className="font-display font-bold text-2xl text-white mb-3">
              Welcome to TubeTarzan! 🎉
            </h1>
            <p className="text-[#999999] text-base leading-relaxed mb-8">
              Let&apos;s get you set up in 4 quick steps. This takes less than
              5 minutes and you&apos;ll be ready to find viral video ideas.
            </p>
            <button
              onClick={() => setStep(1)}
              className="bg-[#FFD200] text-[#080808] font-bold px-8 py-3 rounded-btn hover:bg-[#FFE033] transition-colors flex items-center gap-2 mx-auto min-h-[44px]"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 1: Choose Plan */}
        {step === 1 && (
          <div>
            <h2 className="font-display font-bold text-xl text-white mb-1">
              Choose your plan
            </h2>
            <p className="text-[#555555] text-sm mb-6">
              Start free or unlock all features with a 7-day free trial.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`border rounded-card p-4 cursor-pointer transition-all ${
                    plan.featured
                      ? "border-[#FFD200] bg-[#FFD200]/5"
                      : "border-[#1E1E1E] hover:border-[#333333]"
                  }`}
                  onClick={() => handlePlanSelect(plan.id)}
                >
                  {plan.featured && (
                    <span className="text-[#FFD200] text-xs font-bold">
                      ★ Popular
                    </span>
                  )}
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="font-display font-bold text-2xl text-white">
                      {plan.price}
                    </span>
                    <span className="text-[#555555] text-xs">{plan.period}</span>
                  </div>
                  <p className="font-semibold text-white text-sm mb-3">
                    {plan.name}
                  </p>
                  <ul className="space-y-1.5 mb-4">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-[#999999]">
                        <Check className="w-3 h-3 text-[#22C55E]" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    className={`w-full py-2 rounded-badge text-xs font-bold min-h-[36px] ${
                      plan.featured
                        ? "bg-[#FFD200] text-[#080808]"
                        : "bg-[#1E1E1E] text-white border border-[#333333]"
                    }`}
                  >
                    {plan.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: API Key */}
        {step === 2 && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#FFD200]/10 rounded-full flex items-center justify-center">
                <Key className="w-5 h-5 text-[#FFD200]" />
              </div>
              <div>
                <h2 className="font-display font-bold text-xl text-white">
                  {isPaidPlan ? "API Key — All Set!" : "Set Up Your YouTube API Key"}
                </h2>
              </div>
            </div>

            {isPaidPlan ? (
              <div className="bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-badge p-4 mb-6">
                <p className="text-[#22C55E] font-medium text-sm">
                  ✓ We handle your API key automatically. No setup needed.
                </p>
              </div>
            ) : (
              <>
                <p className="text-[#999999] text-sm leading-relaxed mb-6">
                  Your plan uses your own free Google API key. This gives you
                  10,000 free API credits per day — more than enough for your
                  daily research.
                </p>

                <div className="bg-[#080808] border border-[#1E1E1E] rounded-badge p-4 mb-6">
                  <h3 className="text-white font-semibold text-sm mb-3">
                    How to get your API key (5 minutes):
                  </h3>
                  <ol className="space-y-2 text-[#999999] text-sm">
                    {[
                      { text: "Go to", link: "console.cloud.google.com", href: "https://console.cloud.google.com" },
                      { text: "Create a new project" },
                      { text: "Enable YouTube Data API v3" },
                      { text: 'Create an API key under "Credentials"' },
                      { text: "Paste your key below" },
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#FFD200] font-mono-stats font-bold flex-shrink-0">
                          {i + 1}.
                        </span>
                        <span>
                          {item.text}{" "}
                          {item.link && (
                            <a
                              href={item.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#FFD200] hover:underline inline-flex items-center gap-1"
                            >
                              {item.link}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>

                {tutorialVideoUrl && (
                  <div className="mb-6">
                    <p className="text-xs font-medium text-[#999999] mb-2">
                      Watch: How to generate your YouTube Data API key
                    </p>
                    <div
                      className="relative w-full rounded-card overflow-hidden"
                      style={{ paddingBottom: "56.25%", border: "1px solid #1E1E1E" }}
                    >
                      <iframe
                        src={tutorialVideoUrl}
                        className="absolute inset-0 w-full h-full"
                        allowFullScreen
                        title="YouTube Data API Key Tutorial"
                      />
                    </div>
                  </div>
                )}

                {apiKeyVerified ? (
                  <div className="bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-badge p-4 mb-6">
                    <p className="text-[#22C55E] font-medium text-sm">
                      ✓ API key verified and saved!
                    </p>
                  </div>
                ) : (
                  <>
                    {apiKeyError && (
                      <div className="bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 text-[#FF3B3B] text-sm rounded-badge px-4 py-3 mb-4">
                        {apiKeyError}
                      </div>
                    )}
                    <div className="flex gap-3 mb-6">
                      <input
                        type="text"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="flex-1 bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200] transition-colors min-h-[44px]"
                      />
                      <button
                        onClick={verifyApiKey}
                        disabled={apiKeyLoading || !apiKey.trim()}
                        className="bg-[#FFD200] text-[#080808] font-bold px-5 py-3 rounded-btn hover:bg-[#FFE033] transition-colors disabled:opacity-50 flex items-center gap-2 min-h-[44px]"
                      >
                        {apiKeyLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Verify & Save"
                        )}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                disabled={!isPaidPlan && !apiKeyVerified}
                className="flex-1 bg-[#FFD200] text-[#080808] font-bold py-3 rounded-btn hover:bg-[#FFE033] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
              {!isPaidPlan && !apiKeyVerified && (
                <button
                  onClick={() => setStep(3)}
                  className="text-[#555555] text-sm hover:text-white transition-colors px-4"
                >
                  Skip for now
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Connect Channel */}
        {step === 3 && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#FF3B3B]/10 rounded-full flex items-center justify-center">
                <Video className="w-5 h-5 text-[#FF3B3B]" />
              </div>
              <div>
                <h2 className="font-display font-bold text-xl text-white">
                  Connect Your YouTube Channel
                </h2>
                <p className="text-[#555555] text-xs">Optional</p>
              </div>
            </div>

            <p className="text-[#999999] text-sm leading-relaxed mb-6">
              Connect your channel so TubeTarzan can:
            </p>

            <ul className="space-y-3 mb-8">
              {[
                "Score all your existing videos",
                "Suggest better titles and descriptions",
                "Apply changes in one click",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-white">
                  <Check className="w-4 h-4 text-[#22C55E] flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="space-y-3">
              <button
                onClick={connectYouTube}
                disabled={channelLoading}
                className="w-full flex items-center justify-center gap-2 bg-white text-[#080808] font-bold py-3 rounded-btn hover:bg-gray-100 transition-colors min-h-[44px]"
              >
                {channelLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="w-5 h-5">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Connect with Google
                  </>
                )}
              </button>

              <button
                onClick={finishOnboarding}
                disabled={finishLoading}
                className="w-full text-[#555555] hover:text-white text-sm py-3 transition-colors flex items-center justify-center gap-1 min-h-[44px]"
              >
                {finishLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Skip for now — I'll do this later →"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
