import Link from "next/link";
import { Zap } from "lucide-react";

const LINKS = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Changelog", href: "/changelog" },
    { label: "Roadmap", href: "/roadmap" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "/contact" },
    { label: "Twitter/X", href: "https://twitter.com/tubetarzan" },
    { label: "YouTube", href: "https://youtube.com/@tubetarzan" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-[#080808] border-t border-[#1E1E1E] py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-[#FFD200] fill-[#FFD200]" />
              <span className="font-display font-bold text-xl text-white">
                TubeTarzan
              </span>
            </Link>
            <p className="text-[#555555] text-sm leading-relaxed">
              &ldquo;The YouTube viral intelligence platform for serious
              automation creators.&rdquo;
            </p>
          </div>

          {/* Link groups */}
          {Object.entries(LINKS).map(([group, links]) => (
            <div key={group}>
              <h4 className="text-white font-semibold text-sm mb-4">{group}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[#555555] hover:text-white text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-[#1E1E1E] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[#555555] text-sm">
            © 2025 TubeTarzan. All rights reserved.
          </p>
          <p className="text-[#555555] text-sm">
            Built for YouTube automation creators worldwide.
          </p>
        </div>
      </div>
    </footer>
  );
}
