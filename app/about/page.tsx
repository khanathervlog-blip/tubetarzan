import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Zap, Target, Users, TrendingUp } from "lucide-react";

export const metadata = {
  title: "About — TubeTarzan",
  description: "TubeTarzan is a YouTube viral intelligence platform built for serious automation creators.",
};

export default function AboutPage() {
  return (
    <main className="bg-[#080808] min-h-screen">
      <Navbar />

      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-[#FFD200]/10 border border-[#FFD200]/20 text-[#FFD200] text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider mb-6">
            About Us
          </div>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-white mb-6 leading-tight">
            Built for YouTube creators<br />who are serious about growth
          </h1>
          <p className="text-[#999999] text-lg leading-relaxed max-w-2xl">
            TubeTarzan was born from a simple frustration: existing tools like VidIQ cost $49/month and still don&apos;t show you what&apos;s actually going viral <em>right now</em> in your niche.
          </p>
        </div>

        <div className="space-y-6 text-[#999999] text-base leading-relaxed mb-16">
          <p>
            We built TubeTarzan around two core signals that actually predict virality: <strong className="text-white">VPH (Views Per Hour)</strong> — how fast a video is gaining views right now — and <strong className="text-white">Outlier Ratio</strong> — how far a video outperformed that channel&apos;s average. A 14x outlier means the algorithm loved it. That&apos;s the signal you should be chasing.
          </p>
          <p>
            Every feature in TubeTarzan is designed to collapse the time between &ldquo;what should I make next?&rdquo; and &ldquo;published and growing.&rdquo; From the intelligence board that scans 200+ videos in 60 seconds, to the AI packaging studio that writes your title, hook, and thumbnail text, to the one-click apply that pushes your optimised metadata directly to YouTube.
          </p>
          <p>
            We&apos;re a small, focused team. We don&apos;t have a VC-funded roadmap of 50 features — we have a clear mission: give every YouTube creator access to the same viral intelligence signals that top creators use, at a price that doesn&apos;t require a business to justify.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 mb-16">
          {[
            {
              icon: Target,
              title: "Our Mission",
              body: "Make viral YouTube intelligence accessible to every creator — not just those who can afford $49/month enterprise tools.",
            },
            {
              icon: TrendingUp,
              title: "The Signal We Chase",
              body: "VPH and Outlier Ratio. Real data. Not keyword stuffing or vanity metrics. What's working right now, in your niche.",
            },
            {
              icon: Zap,
              title: "Speed First",
              body: "From niche idea to published, optimised video — we collapse the research phase from hours to 60 seconds.",
            },
            {
              icon: Users,
              title: "Built for Creators",
              body: "Every feature is designed for YouTube automation creators. No bloat. No features you'll never use.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6">
              <Icon className="w-6 h-6 text-[#FFD200] mb-3" />
              <h3 className="font-semibold text-white text-lg mb-2">{title}</h3>
              <p className="text-[#999999] text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-8 text-center">
          <h2 className="font-display font-bold text-2xl text-white mb-3">Questions or feedback?</h2>
          <p className="text-[#999999] text-sm mb-6">We read every message. Seriously.</p>
          <a
            href="mailto:support@tubetarzan.com"
            className="inline-flex items-center gap-2 bg-[#FFD200] text-[#080808] font-bold px-6 py-3 rounded-xl hover:bg-[#FFE033] transition-colors"
          >
            support@tubetarzan.com
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}
