import { Lightbulb, Clapperboard, Languages, Wallet, Globe2, ShieldCheck } from "lucide-react";

const POINTS = [
  { icon: Lightbulb, title: "Ideas first, not just stats", text: "Scans 200+ videos in your niche, ranks them by views per hour and outlier score, then turns winners into a title, hook, script and thumbnail text." },
  { icon: Clapperboard, title: "Idea to upload in one place", text: "Script writer, AI voiceover, free B-roll, thumbnails, captions and a publish calendar - so you don't pay for five separate tools." },
  { icon: Languages, title: "Captions in up to 20 languages", text: "Speak Urdu, Hindi or English: get timed captions free in your browser, then translate to 5, 9 or 20 languages and download them as ready-to-upload SRT files." },
  { icon: Wallet, title: "Built to be affordable", text: "Free plan with no card. Paid plans start at a fraction of what most channel tools charge, with a 7-day free trial." },
  { icon: Globe2, title: "Made for global creators", text: "Works for any language and niche, with a Niche RPM guide so you know which topics actually pay." },
  { icon: ShieldCheck, title: "Safe by design", text: "Official YouTube data only. Your videos stay in your browser for captions, and you can disconnect your channel any time." },
];

/** "Why TubeTarzan" - plain differentiators (no unverifiable claims about other products). */
export default function WhyTubeTarzan() {
  return (
    <section id="why" className="py-20 lg:py-24 bg-[#0B0B0B] scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-[#FFD200] text-xs font-bold uppercase tracking-widest mb-4">Why TubeTarzan</p>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-white">A VidIQ &amp; TubeBuddy alternative that also helps you make the video</h2>
          <p className="text-[#999999] mt-4 max-w-2xl mx-auto">Keyword and analytics tools tell you what happened. TubeTarzan tells you what to make next and helps you finish it.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {POINTS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6">
              <Icon className="w-6 h-6 text-[#FFD200] mb-4" />
              <h3 className="text-white font-bold mb-2">{title}</h3>
              <p className="text-[#999999] text-sm leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
