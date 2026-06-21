import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Mail, MessageSquare, Clock } from "lucide-react";

export const metadata = {
  title: "Contact — TubeTarzan",
  description: "Get in touch with the TubeTarzan team. We reply within 24 hours.",
};

export default function ContactPage() {
  return (
    <main className="bg-[#080808] min-h-screen">
      <Navbar />

      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-[#FFD200]/10 border border-[#FFD200]/20 text-[#FFD200] text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider mb-6">
            Contact
          </div>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-white mb-4">
            We&apos;re here to help
          </h1>
          <p className="text-[#999999] text-lg">
            Questions, bugs, feedback, or just want to say hi — we read every message.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 mb-12">
          {[
            {
              icon: Mail,
              title: "Support",
              body: "For account issues, billing, and technical help.",
              link: "mailto:support@tubetarzan.com",
              linkLabel: "support@tubetarzan.com",
            },
            {
              icon: MessageSquare,
              title: "Live Chat",
              body: "Use the chat widget on any page — Tarzan replies instantly.",
              link: null,
              linkLabel: "Open chat widget ↓",
            },
            {
              icon: Clock,
              title: "Response Time",
              body: "AI replies instantly 24/7. Human follow-up within 24 hours.",
              link: null,
              linkLabel: null,
            },
          ].map(({ icon: Icon, title, body, link, linkLabel }) => (
            <div key={title} className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6">
              <Icon className="w-6 h-6 text-[#FFD200] mb-3" />
              <h3 className="font-semibold text-white text-base mb-2">{title}</h3>
              <p className="text-[#999999] text-sm leading-relaxed mb-3">{body}</p>
              {link && linkLabel && (
                <a href={link} className="text-[#FFD200] hover:underline text-sm font-medium">
                  {linkLabel}
                </a>
              )}
              {!link && linkLabel && (
                <span className="text-[#555555] text-sm">{linkLabel}</span>
              )}
            </div>
          ))}
        </div>

        <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-8">
          <h2 className="font-display font-bold text-2xl text-white mb-2">Common questions</h2>
          <p className="text-[#555555] text-sm mb-8">
            These topics are usually faster to answer from our docs or chat widget.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              ["How do I get a YouTube API key?", "/contact"],
              ["Why is my API key showing invalid?", "/contact"],
              ["How do I upgrade or cancel my plan?", "/contact"],
              ["Can I change my connected channel?", "/contact"],
              ["Why are my changes not showing on YouTube?", "/contact"],
              ["How do I get a refund?", "/contact"],
            ].map(([question]) => (
              <div key={question} className="flex items-start gap-3 py-3 border-b border-[#1E1E1E] last:border-0">
                <span className="text-[#FFD200] mt-0.5">→</span>
                <span className="text-[#999999] text-sm">{question}</span>
              </div>
            ))}
          </div>
          <p className="text-[#555555] text-sm mt-6">
            For anything not listed above, email{" "}
            <a href="mailto:support@tubetarzan.com" className="text-[#FFD200] hover:underline">
              support@tubetarzan.com
            </a>{" "}
            and we&apos;ll get back to you within 24 hours.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
