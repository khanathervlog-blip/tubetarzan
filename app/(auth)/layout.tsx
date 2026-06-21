import Link from "next/link";
import { Zap } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#080808] flex flex-col">
      {/* Auth navbar */}
      <nav className="border-b border-[#1E1E1E] px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <Zap className="w-5 h-5 text-[#FFD200] fill-[#FFD200]" />
            <span className="font-display font-bold text-xl text-white">
              TubeTarzan
            </span>
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </div>
    </div>
  );
}
