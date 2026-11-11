import Link from "next/link";
import { Users, Eye, MousePointerClick, Clock, Radio, RefreshCw } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Visitors | Admin" };

const RANGES = [
  [1, "24 hours"],
  [7, "7 days"],
  [30, "30 days"],
  [90, "90 days"],
] as const;

interface Row { name: string; people: number; views: number }
interface Stats {
  visitors: number;
  views: number;
  sessions: number;
  bounced: number;
  new_visitors: number;
  logged_in_views: number;
  avg_seconds: number;
  live_now: number;
  counting_since: string | null;
  daily: { day: string; views: number; visitors: number }[];
  hours: { hour: number; views: number }[];
  pages: Row[];
  sources: Row[];
  countries: Row[];
  devices: Row[];
  browsers: Row[];
  os: Row[];
  languages: Row[];
  campaigns: Row[];
  live: { path: string; country: string | null; device: string | null; referrer_host: string | null; last_seen: string }[];
  latest: { ts: string; path: string; country: string | null; device: string | null; browser: string | null; os: string | null; source: string; is_new_visitor: boolean; logged_in: boolean }[];
}

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const flag = (cc: string | null) =>
  cc && /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map((c) => 127397 + c.charCodeAt(0))) : "🌐";
const countryName = (cc: string | null) => {
  try {
    return cc && /^[A-Z]{2}$/.test(cc) ? regionNames.of(cc) ?? cc : "Unknown";
  } catch {
    return cc ?? "Unknown";
  }
};
const pct = (n: number, t: number) => (t ? Math.round((n / t) * 100) : 0);

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
      <h2 className="text-white font-semibold text-sm mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Bars({ title, rows, total, label }: { title: string; rows: Row[]; total: number; label?: (k: string) => string }) {
  return (
    <Card title={title}>
      {rows.length === 0 ? (
        <p className="text-[#555555] text-sm">No data yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.name} className="text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-[#CCCCCC] truncate">{label ? label(r.name) : r.name}</span>
                <span className="shrink-0 text-white font-semibold">
                  {r.people} <span className="text-[#555555] font-normal text-xs">{pct(r.people, total)}% · {r.views} views</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-[#1E1E1E] overflow-hidden">
                <div className="h-1.5 rounded-full bg-[#FFD200]" style={{ width: `${Math.max(3, pct(r.people, total))}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default async function VisitorsPage({ searchParams }: { searchParams: { days?: string } }) {
  const asked = Number(searchParams.days);
  const days = RANGES.some(([d]) => d === asked) ? asked : 7;

  const svc = await createServiceClient();
  const { data, error } = await svc.rpc("admin_visitor_stats", { p_days: days });
  const s = data as Stats | null;

  if (error || !s) {
    return (
      <div className="max-w-3xl">
        <h1 className="font-display font-bold text-2xl text-white mb-2">Visitors</h1>
        <div className="bg-[#111111] border border-[#FFD200]/30 rounded-card p-6 text-sm text-[#CCCCCC] space-y-2">
          <p className="text-white font-semibold">Visitor tracking is not set up in the database yet.</p>
          <p>
            Open Supabase → SQL Editor and run <code className="text-[#FFD200]">PHASE9_MIGRATIONS.sql</code> from the project
            folder. Visits start appearing here a few seconds after someone opens the website.
          </p>
          {error && <p className="text-[#555555] text-xs">Database said: {error.message}</p>}
        </div>
      </div>
    );
  }

  const people = Math.max(1, s.visitors);
  const maxDay = Math.max(1, ...s.daily.map((d) => d.views));
  const peak = s.hours.length ? s.hours.reduce((a, b) => (b.views > a.views ? b : a)) : null;
  const since = s.counting_since
    ? new Date(s.counting_since).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : null;

  const STATS = [
    { label: "Visitors", value: s.visitors, icon: Users },
    { label: "Page views", value: s.views, icon: Eye },
    { label: "Visits (sessions)", value: s.sessions, icon: MousePointerClick },
    { label: "Avg. time on page", value: s.avg_seconds ? `${s.avg_seconds}s` : "—", icon: Clock },
  ];

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Visitors</h1>
          <p className="text-[#555555] text-sm mt-1">
            Who visits TubeTarzan, from where, on which device and how they found you. No IP addresses are stored;
            country is estimated from the visitor&apos;s time zone. Robots and the admin panel are not counted.
          </p>
        </div>
        <Link
          href={`/admin/visitors?days=${days}`}
          className="inline-flex items-center gap-2 text-sm text-[#999999] hover:text-white border border-[#1E1E1E] rounded-btn px-3 py-2"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {RANGES.map(([d, l]) => (
          <Link
            key={d}
            href={`/admin/visitors?days=${d}`}
            className={`px-4 py-2 rounded-full text-sm border ${
              d === days ? "bg-[#FFD200] text-[#080808] border-[#FFD200] font-semibold" : "border-[#1E1E1E] text-[#999999] hover:text-white"
            }`}
          >
            Last {l}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#555555] text-xs font-medium uppercase tracking-wider">{label}</span>
              <Icon className="w-4 h-4 text-[#FFD200]" />
            </div>
            <p className="font-display font-bold text-2xl text-white">{value}</p>
          </div>
        ))}
      </div>

      <p className="text-[#999999] text-sm flex flex-wrap gap-x-5 gap-y-1">
        <span className="inline-flex items-center gap-2">
          <Radio className="w-4 h-4 text-[#22C55E]" /> <b className="text-white">{s.live_now}</b> on the site right now
        </span>
        <span>{s.new_visitors} new · {Math.max(0, s.visitors - s.new_visitors)} returning</span>
        <span>{s.sessions ? `${(s.views / s.sessions).toFixed(1)} pages per visit` : "no visits yet"}</span>
        {s.sessions > 0 && <span>{pct(s.bounced, s.sessions)}% left after one page</span>}
        <span>{s.logged_in_views} views by signed-in users</span>
        {peak && <span>Busiest hour: {peak.hour}:00–{peak.hour + 1}:00 UTC</span>}
        {since && <span className="text-[#555555]">Counting since {since}</span>}
      </p>

      <Card title="Page views (bar) and visitors (yellow) per day">
        {s.views === 0 ? (
          <p className="text-[#555555] text-sm">No visits in this period yet.</p>
        ) : (
          <>
            <div className="flex items-end gap-1 h-44" role="img" aria-label="Daily page views">
              {s.daily.map((d) => (
                <div key={d.day} className="flex-1 h-full flex items-end min-w-[2px]" title={`${d.day}: ${d.views} views, ${d.visitors} visitors`}>
                  <div className="w-full rounded-t bg-[#FFD200]/20" style={{ height: `${(d.views / maxDay) * 100}%` }}>
                    <div className="w-full rounded-t bg-[#FFD200]" style={{ height: d.views ? `${(d.visitors / d.views) * 100}%` : 0 }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-[#555555]">
              <span>{s.daily[0]?.day}</span>
              <span>{s.daily[s.daily.length - 1]?.day}</span>
            </div>
          </>
        )}
      </Card>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        <Card title="Live now (last 5 minutes)">
          {s.live.length ? (
            <ul className="space-y-2 text-sm text-[#CCCCCC]">
              {s.live.map((r, i) => (
                <li key={i} className="truncate">
                  {flag(r.country)} {countryName(r.country)} · <span className="font-mono text-xs">{r.path}</span> · {r.device ?? "?"}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[#555555] text-sm">Nobody right now.</p>
          )}
        </Card>
        <Bars title="Pages people open" rows={s.pages} total={people} label={(k) => (k === "/" ? "/ (homepage)" : k)} />
        <Bars title="Where they came from" rows={s.sources} total={people} />
        <Bars title="Countries" rows={s.countries} total={people} label={(k) => `${flag(k === "??" ? null : k)}  ${countryName(k === "??" ? null : k)}`} />
        <Bars title="Device" rows={s.devices} total={people} />
        <Bars title="Browser" rows={s.browsers} total={people} />
        <Bars title="Operating system" rows={s.os} total={people} />
        <Bars title="Browser language" rows={s.languages} total={people} />
        <Bars title="Campaigns (utm_campaign)" rows={s.campaigns} total={people} />
      </div>

      <Card title="Latest visits">
        {s.latest.length === 0 ? (
          <p className="text-[#555555] text-sm">Nothing yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-[#555555]">
                  {["When (PKT)", "Where from", "Opened", "Came from", "Device", ""].map((h) => (
                    <th key={h} className="py-2 pr-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.latest.map((r, i) => (
                  <tr key={i} className="border-t border-[#1E1E1E] text-[#CCCCCC]">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {new Date(r.ts).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Karachi" })}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">{flag(r.country)} {countryName(r.country)}</td>
                    <td className="py-2 pr-3 font-mono text-xs max-w-[260px] truncate">{r.path}</td>
                    <td className="py-2 pr-3">{r.source}</td>
                    <td className="py-2 pr-3 whitespace-nowrap text-[#999999]">{r.device ?? "?"} · {r.browser ?? "?"} · {r.os ?? "?"}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {r.is_new_visitor && <span className="text-[10px] font-bold text-[#FFD200] mr-2">NEW</span>}
                      {r.logged_in && <span className="text-[10px] font-bold text-[#22C55E]">SIGNED IN</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
