"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, Zap, AlertTriangle, CreditCard } from "lucide-react";
import type { Profile } from "@/types/database";

interface SubscriptionGateProps {
  profile: Profile | null;
  requiredPlan?: "creator" | "pro" | "agency";
  feature?: string;
  children: React.ReactNode;
}

export default function SubscriptionGate({
  profile,
  requiredPlan = "creator",
  feature = "this feature",
  children,
}: SubscriptionGateProps) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const PLAN_RANK: Record<string, number> = {
    free: 0,
    creator: 1,
    pro: 2,
    agency: 3,
  };

  const userPlanRank = PLAN_RANK[profile?.subscription_plan || "free"] ?? 0;
  const requiredPlanRank = PLAN_RANK[requiredPlan] ?? 1;

  // Past due banner
  if (profile?.subscription_status === "past_due") {
    return (
      <div>
        <div className="mb-4 bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 rounded-card px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#FF3B3B] flex-shrink-0" />
            <span className="text-[#FF3B3B] text-sm font-medium">
              Payment failed — your access may be paused soon
            </span>
          </div>
          <Link
            href="/dashboard/billing"
            className="flex items-center gap-1.5 bg-[#FF3B3B] text-white text-xs font-bold px-3 py-1.5 rounded-badge hover:bg-[#FF5555] transition-colors flex-shrink-0"
          >
            <CreditCard className="w-3 h-3" />
            Update card
          </Link>
        </div>
        {children}
      </div>
    );
  }

  // Subscription ended
  if (
    profile?.subscription_status === "canceled" &&
    profile.subscription_period_end &&
    new Date(profile.subscription_period_end) < new Date()
  ) {
    return (
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-[#FF3B3B] mx-auto mb-4" />
        <h3 className="font-display font-bold text-xl text-white mb-3">
          Subscription ended
        </h3>
        <p className="text-[#999999] text-sm mb-6">
          Your subscription has ended. Resubscribe to continue using
          TubeTarzan.
        </p>
        <Link
          href="/dashboard/billing"
          className="bg-[#FFD200] text-[#080808] font-bold px-6 py-3 rounded-btn hover:bg-[#FFE033] transition-colors inline-block"
        >
          Resubscribe
        </Link>
      </div>
    );
  }

  // Access blocked — show upgrade prompt
  if (userPlanRank < requiredPlanRank) {
    return (
      <>
        <div
          className="relative cursor-pointer"
          onClick={() => setShowUpgradeModal(true)}
        >
          <div className="pointer-events-none opacity-30 select-none blur-[2px]">
            {children}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-[#111111] border border-[#FFD200] rounded-card p-6 text-center max-w-sm mx-4">
              <Lock className="w-8 h-8 text-[#FFD200] mx-auto mb-3" />
              <h3 className="font-display font-bold text-white mb-2">
                Upgrade to access {feature}
              </h3>
              <p className="text-[#999999] text-sm mb-4">
                Available on {requiredPlan} plan and above
              </p>
              <button className="bg-[#FFD200] text-[#080808] font-bold px-6 py-2.5 rounded-btn hover:bg-[#FFE033] transition-colors flex items-center gap-2 mx-auto">
                <Zap className="w-4 h-4" />
                Upgrade Now
              </button>
            </div>
          </div>
        </div>

        {showUpgradeModal && (
          <div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setShowUpgradeModal(false)}
          >
            <div
              className="bg-[#111111] border border-[#1E1E1E] rounded-card p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <Lock className="w-10 h-10 text-[#FFD200] mx-auto mb-4" />
              <h3 className="font-display font-bold text-xl text-white text-center mb-3">
                Upgrade to {requiredPlan}
              </h3>
              <p className="text-[#999999] text-sm text-center mb-6">
                Unlock {feature} and much more with a{" "}
                {requiredPlan === "creator" ? "$9/month" : requiredPlan === "pro" ? "$25/month" : "$99/month"}{" "}
                subscription.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1 border border-[#333333] text-white py-3 rounded-btn hover:border-[#555555] transition-colors text-sm"
                >
                  Not now
                </button>
                <Link
                  href={`/dashboard/billing?upgrade=${requiredPlan}`}
                  className="flex-1 bg-[#FFD200] text-[#080808] font-bold py-3 rounded-btn hover:bg-[#FFE033] transition-colors text-center text-sm"
                >
                  Upgrade →
                </Link>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
}
