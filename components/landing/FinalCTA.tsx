import Link from "next/link";
import { Zap } from "lucide-react";

export default function FinalCTA() {
  return (
    <section
      className="py-24 lg:py-32"
      style={{
        background: "linear-gradient(180deg, #0D0505 0%, #080808 100%)",
      }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl text-white leading-tight mb-6">
          STOP GUESSING.
          <br />
          <span className="text-gradient-viral">START SWINGING.</span>
        </h2>

        <p className="text-[#999999] text-xl mb-10 max-w-xl mx-auto leading-relaxed">
          Join 1,200+ YouTube automation creators who have replaced their
          manual research with TubeTarzan.
        </p>

        <Link
          href="/signup"
          className="inline-flex items-center gap-2 bg-[#FFD200] text-[#080808] font-bold text-lg px-10 py-5 rounded-btn hover:bg-[#FFE033] transition-colors min-h-[60px]"
        >
          <Zap className="w-5 h-5" />
          Start Free — No Card Required
        </Link>

        <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm text-[#555555]">
          <span>Setup in 5 minutes</span>
          <span className="text-[#333333]">·</span>
          <span>Cancel anytime</span>
          <span className="text-[#333333]">·</span>
          <span>7-day trial on paid plans</span>
        </div>
      </div>
    </section>
  );
}
