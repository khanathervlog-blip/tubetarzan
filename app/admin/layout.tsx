import Link from "next/link";
import { Zap, BarChart3, Video, Users, CreditCard, Mail, Settings, MessageSquare } from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/video", label: "Video & Content", icon: Video },
  { href: "/admin/leads", label: "Leads", icon: Users },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/emails", label: "Emails", icon: Mail },
  { href: "/admin/support", label: "Support", icon: MessageSquare },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#080808] flex">
      {/* Sidebar */}
      <aside className="w-60 bg-[#0A0A0A] border-r border-[#1E1E1E] flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-[#1E1E1E]">
          <Link href="/" className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#FFD200] fill-[#FFD200]" />
            <span className="font-display font-bold text-base text-white">
              TubeTarzan
            </span>
          </Link>
          <span className="text-[#555555] text-xs mt-1 block">Admin Panel</span>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-btn text-[#999999] hover:text-white hover:bg-[#111111] transition-colors text-sm group"
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#1E1E1E]">
          <Link
            href="/dashboard"
            className="text-[#555555] hover:text-white text-xs transition-colors"
          >
            ← Back to App
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
