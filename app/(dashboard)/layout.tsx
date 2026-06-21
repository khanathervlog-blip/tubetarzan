import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Zap,
  LayoutDashboard,
  Lightbulb,
  Video,
  Users,
  Settings,
  LogOut,
  Package,
} from "lucide-react";
import type { Profile } from "@/types/database";
import AnnouncementBarWrapper from "@/components/shared/AnnouncementBarWrapper";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Intelligence Board", icon: LayoutDashboard },
  { href: "/dashboard/ideas", label: "Idea Tracker", icon: Lightbulb },
  { href: "/dashboard/channel", label: "My Channel", icon: Video },
  { href: "/dashboard/packaging", label: "Packaging Studio", icon: Package },
  { href: "/dashboard/competitors", label: "Competitors", icon: Users },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("full_name, email, subscription_plan, subscription_status")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as Pick<Profile, "full_name" | "email" | "subscription_plan" | "subscription_status"> | null;

  // Load announcement bar setting
  const { data: announcementRow } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", "announcement_bar")
    .maybeSingle();
  const announcementData = announcementRow?.value
    ? (() => { try { return JSON.parse(announcementRow.value); } catch { return null; } })()
    : null;

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col">
      {/* Announcement bar */}
      {announcementData?.enabled && announcementData?.message && (
        <AnnouncementBarWrapper
          message={announcementData.message}
          link={announcementData.link}
          linkText={announcementData.linkText}
        />
      )}

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-60 bg-[#0A0A0A] border-r border-[#1E1E1E] flex flex-col flex-shrink-0 hidden md:flex">
          <div className="p-5 border-b border-[#1E1E1E]">
            <Link href="/" className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#FFD200] fill-[#FFD200]" />
              <span className="font-display font-bold text-base text-white">
                TubeTarzan
              </span>
            </Link>
            {profile?.subscription_plan && (
              <span
                className="text-xs font-medium mt-1.5 inline-block px-2 py-0.5 rounded-badge capitalize"
                style={{
                  background: profile.subscription_plan === "free" ? "#1E1E1E" : "#FFD200",
                  color: profile.subscription_plan === "free" ? "#555555" : "#080808",
                }}
              >
                {profile.subscription_plan}
              </span>
            )}
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-btn text-[#999999] hover:text-white hover:bg-[#111111] transition-colors text-sm"
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-[#1E1E1E] space-y-3">
            <div>
              <p className="text-white text-xs font-medium truncate">
                {profile?.full_name || profile?.email}
              </p>
              <p className="text-[#555555] text-xs truncate">{profile?.email}</p>
            </div>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="flex items-center gap-2 text-[#555555] hover:text-white text-xs transition-colors min-h-[36px]"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          <div className="p-4 md:p-6 lg:p-8">{children}</div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0A0A0A] border-t border-[#1E1E1E] flex items-center justify-around px-2 py-2 z-40">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 text-[#555555] hover:text-white transition-colors px-2 py-1 min-w-0"
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] leading-tight truncate max-w-12 text-center">
                {item.label.split(" ")[0]}
              </span>
            </Link>
          );
        })}
        <Link
          href="/dashboard/settings"
          className="flex flex-col items-center gap-0.5 text-[#555555] hover:text-white transition-colors px-2 py-1"
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px]">Settings</span>
        </Link>
      </nav>
    </div>
  );
}
