"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Zap } from "lucide-react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[rgba(8,8,8,0.95)] border-b border-[#1E1E1E]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <Zap className="w-5 h-5 text-[#FFD200] fill-[#FFD200]" />
            <span className="font-display font-bold text-xl text-white">
              TubeTarzan
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-[#999999] hover:text-white transition-colors text-sm font-medium"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-[#999999] hover:text-white transition-colors text-sm font-medium"
            >
              Pricing
            </a>
            <Link
              href="/login"
              className="text-[#999999] hover:text-white transition-colors text-sm font-medium"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="bg-[#FFD200] text-[#080808] font-bold text-sm px-5 py-2 rounded-btn hover:bg-[#FFE033] transition-colors"
            >
              Start Free →
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-white p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#080808] border-t border-[#1E1E1E] px-4 py-4 flex flex-col gap-4">
          <a
            href="#features"
            className="text-[#999999] hover:text-white transition-colors text-base font-medium py-2"
            onClick={() => setMobileOpen(false)}
          >
            Features
          </a>
          <a
            href="#pricing"
            className="text-[#999999] hover:text-white transition-colors text-base font-medium py-2"
            onClick={() => setMobileOpen(false)}
          >
            Pricing
          </a>
          <Link
            href="/login"
            className="text-[#999999] hover:text-white transition-colors text-base font-medium py-2"
            onClick={() => setMobileOpen(false)}
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="bg-[#FFD200] text-[#080808] font-bold text-base px-5 py-3 rounded-btn hover:bg-[#FFE033] transition-colors text-center min-h-[44px] flex items-center justify-center"
          >
            Start Free →
          </Link>
        </div>
      )}
    </nav>
  );
}
