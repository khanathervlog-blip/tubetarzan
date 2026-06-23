import Link from "next/link";
import {
  Zap,
  BarChart3,
  Video,
  Users,
  CreditCard,
  Mail,
  Settings,
  MessageSquare,
  Shield,
  FlaskConical,
  Key,
  Database,
  Server,
  DollarSign,
  TrendingUp,
  Film,
  Gauge,
  UserCog,
  Globe,
} from "lucide-react";

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: BarChart3 },
      { href: "/admin/revenue", label: "Revenue", icon: DollarSign },
      { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
    ],
  },
  {
    label: "Users & Content",
    items: [
      { href: "/admin/users", label: "Users", icon: UserCog },
      { href: "/admin/leads", label: "Leads", icon: Users },
      { href: "/admin/video", label: "Video & Content", icon: Video },
      { href: "/admin/content", label: "Content Monitor", icon: Film },
      { href: "/admin/landing", label: "Landing Page", icon: Globe },
      { href: "/admin/emails", label: "Emails", icon: Mail },
      { href: "/admin/support", label: "Support", icon: MessageSquare },
    ],
  },
  {
    label: "Security",
    items: [
      { href: "/admin/security", label: "Security Center", icon: Shield },
      { href: "/admin/test-accounts", label: "Test Accounts", icon: FlaskConical },
      { href: "/admin/quota", label: "Quota Manager", icon: Gauge },
    ],
  },
  {
    label: "Platform",
    items: [
      { href: "/admin/api-keys", label: "API Keys", icon: Key },
      { href: "/admin/cache", label: "Cache Manager", icon: Database },
      { href: "/admin/niche-data", label: "Niche RPM Data", icon: TrendingUp },
      { href: "/admin/system", label: "System Health", icon: Server },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#080808] flex">
      {/* Sidebar */}
      <aside className="w-60 bg-[#0A0A0A] border-r border-[#1E1E1E] flex flex-col flex-shrink-0 overflow-y-auto">
        <div className="p-5 border-b border-[#1E1E1E] shrink-0">
          <Link href="/" className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#FFD200] fill-[#FFD200]" />
            <span className="font-display font-bold text-base text-white">
              TubeTarzan
            </span>
          </Link>
          <span className="text-[#555555] text-xs mt-1 block">Admin Panel</span>
        </div>

        <nav className="flex-1 p-3">
          {NAV_SECTIONS.map((section, si) => (
            <div key={section.label} className={si > 0 ? "mt-4" : ""}>
              <p className="text-[#333333] text-[10px] font-bold uppercase tracking-widest px-3 mb-1">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-btn text-[#999999] hover:text-white hover:bg-[#111111] transition-colors text-sm group"
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-[#1E1E1E] shrink-0">
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
