interface QuotaMeterProps {
  usedToday: number;
  limit: number;
  plan: string;
  isAdmin?: boolean;
}

export default function QuotaMeter({ usedToday, limit, plan, isAdmin = false }: QuotaMeterProps) {
  const isManaged = plan === "pro" || plan === "agency";
  const pct = isManaged ? 0 : Math.min(100, (usedToday / limit) * 100);

  let barColor = "#22C55E";
  if (pct > 80) barColor = "#FF3B3B";
  else if (pct > 50) barColor = "#FFB700";

  const remaining = limit - usedToday;

  return (
    <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[#555555] text-xs">
          {isManaged ? "API Quota — Managed by TubeTarzan" : "Your API key quota"}
        </span>
        <span className="font-mono-stats text-xs text-white">
          {isManaged
            ? "Unlimited"
            : `${usedToday.toLocaleString()} / ${limit.toLocaleString()} units`}
        </span>
      </div>
      {!isManaged && (
        <div className="h-1.5 bg-[#1E1E1E] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: barColor }}
          />
        </div>
      )}
      {isAdmin && pct >= 90 && (
        <div className="mt-3 bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 text-[#FF3B3B] text-xs px-3 py-2 rounded-badge">
          ⚠ Quota critical (90%+ used) — only {remaining.toLocaleString()} units remaining today
        </div>
      )}
      {isAdmin && pct >= 80 && pct < 90 && (
        <div className="mt-3 bg-[#FFB700]/10 border border-[#FFB700]/20 text-[#FFB700] text-xs px-3 py-2 rounded-badge">
          ⚠ Quota at 80% — {remaining.toLocaleString()} units remaining today
        </div>
      )}
    </div>
  );
}
