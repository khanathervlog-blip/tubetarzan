/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { CheckCircle2, XCircle, KeyRound, Clapperboard, RefreshCw } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { hfTokens, keyFingerprint, spaceReference, lipsyncOpenToPaidPlans, dailySecondsPerKey } from "@/lib/lipsync-server";
import { LIPSYNC_SECONDS_PER_MONTH, formatSeconds } from "@/lib/plans";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lip Sync | Admin" };

function Check({ ok, label, hint }: { ok: boolean; label: string; hint?: string }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      {ok ? <CheckCircle2 className="w-4 h-4 text-[#22C55E] mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 text-[#FF3B3B] mt-0.5 shrink-0" />}
      <span className="text-[#CCCCCC]">
        {label}
        {!ok && hint && <span className="block text-[#555555] text-xs">{hint}</span>}
      </span>
    </li>
  );
}

export default async function AdminLipSyncPage() {
  const svc = await createServiceClient();
  const tokens = hfTokens();
  const fps = tokens.map(keyFingerprint);
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();

  const [states, usage, runs, clipsMonth, bucket] = await Promise.all([
    fps.length ? svc.from("lipsync_key_state").select("key_fp, exhausted_until, last_error").in("key_fp", fps) : Promise.resolve({ data: [], error: null }),
    fps.length ? svc.from("lipsync_key_usage").select("key_fp, clips, seconds").eq("day", today).in("key_fp", fps) : Promise.resolve({ data: [], error: null }),
    svc.from("lipsync_runs").select("id, user_id, created_at, status, total_seconds, clip_count, done_count, error").order("created_at", { ascending: false }).limit(20),
    svc.from("lipsync_clips").select("user_id, duration_sec, status").gte("created_at", monthStart),
    svc.storage.getBucket("lipsync"),
  ]);

  const tablesReady = !runs.error;
  const stateBy = new Map((states.data || []).map((s: any) => [s.key_fp, s]));
  const usageBy = new Map((usage.data || []).map((u: any) => [u.key_fp, u]));

  const perUser = new Map<string, { seconds: number; clips: number; failed: number }>();
  for (const c of (clipsMonth.data || []) as any[]) {
    const e = perUser.get(c.user_id) || { seconds: 0, clips: 0, failed: 0 };
    if (c.status === "failed") e.failed++;
    else { e.seconds += Number(c.duration_sec || 0); e.clips++; }
    perUser.set(c.user_id, e);
  }
  const userIds = Array.from(new Set([...Array.from(perUser.keys()), ...((runs.data || []) as any[]).map((r) => r.user_id)]));
  const { data: profiles } = userIds.length
    ? await svc.from("profiles").select("id, email, subscription_plan").in("id", userIds)
    : { data: [] as any[] };
  const who = new Map((profiles || []).map((p: any) => [p.id, p]));
  const totalSeconds = Array.from(perUser.values()).reduce((s, e) => s + e.seconds, 0);
  const todaySeconds = (usage.data || []).reduce((s: number, u: any) => s + Number(u.seconds || 0), 0);
  const poolBudget = tokens.length * dailySecondsPerKey();
  const poolRemaining = Math.max(0, poolBudget - todaySeconds);
  const poolPct = poolBudget > 0 ? Math.round((todaySeconds / poolBudget) * 100) : 0;

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Lip Sync</h1>
          <p className="text-[#555555] text-sm mt-1">Free GPU pool (Hugging Face ZeroGPU), usage and jobs. Clips are at most 10 seconds (LatentSync).</p>
        </div>
        <Link href="/admin/lipsync" className="inline-flex items-center gap-2 text-sm text-[#999999] hover:text-white border border-[#1E1E1E] rounded-btn px-3 py-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
          <h2 className="text-white font-semibold text-sm mb-4">Setup checklist</h2>
          <ul className="space-y-2">
            <Check ok={tablesReady} label="Database tables (PHASE9_MIGRATIONS.sql)" hint="Run PHASE9_MIGRATIONS.sql in the Supabase SQL editor." />
            <Check ok={!bucket.error && !!bucket.data} label="Storage bucket “lipsync”" hint="Created by PHASE9_MIGRATIONS.sql." />
            <Check ok={!!spaceReference()} label={`GPU Space: ${spaceReference() || "not set"}`} hint="Set HF_LIPSYNC_SPACE_URL in Vercel (see hf-space/README.md)." />
            <Check ok={tokens.length > 0} label={`${tokens.length} Hugging Face key${tokens.length === 1 ? "" : "s"} in HF_TOKENS`} hint="Add the accounts' tokens, comma-separated." />
            <Check
              ok={lipsyncOpenToPaidPlans()}
              label={lipsyncOpenToPaidPlans() ? "Open to paid plans (NEXT_PUBLIC_LIPSYNC_PAID=true)" : "Admin only (paid plans switched off)"}
              hint="Only switch on with a commercially licensed engine (Wav2Lip is non-commercial)."
            />
          </ul>
        </div>
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
          <h2 className="text-white font-semibold text-sm mb-4">GPU quota</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[#555555] text-xs uppercase">Today</p>
              <p className="text-white text-2xl font-bold">
                {formatSeconds(todaySeconds)} <span className="text-[#555555] text-sm font-normal">/ {formatSeconds(poolBudget)}</span>
              </p>
            </div>
            <div>
              <p className="text-[#555555] text-xs uppercase">Left today</p>
              <p className={`text-2xl font-bold ${poolRemaining > 0 ? "text-[#22C55E]" : "text-[#FF3B3B]"}`}>{formatSeconds(poolRemaining)}</p>
            </div>
          </div>
          <div className="h-2 bg-[#1E1E1E] rounded-full mt-4 overflow-hidden">
            <div
              className={`h-full rounded-full ${poolPct >= 100 ? "bg-[#FF3B3B]" : poolPct >= 80 ? "bg-[#FFD200]" : "bg-[#22C55E]"}`}
              style={{ width: `${Math.min(100, poolPct)}%` }}
            />
          </div>
          <p className="text-[#555555] text-xs mt-3">
            Budget = {tokens.length} key{tokens.length === 1 ? "" : "s"} × {formatSeconds(dailySecondsPerKey())} of video per day
            (LIPSYNC_DAILY_SECONDS_PER_KEY env). Runs stop at this budget so the free ZeroGPU quota is never exceeded; it resets at
            midnight UTC. This month: {formatSeconds(totalSeconds)}. Allowances: Creator {formatSeconds(LIPSYNC_SECONDS_PER_MONTH.creator)} ·
            Pro {formatSeconds(LIPSYNC_SECONDS_PER_MONTH.pro)} · Agency {formatSeconds(LIPSYNC_SECONDS_PER_MONTH.agency)} per month.
          </p>
        </div>
      </div>

      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
        <h2 className="text-white font-semibold text-sm mb-4 flex items-center gap-2"><KeyRound className="w-4 h-4 text-[#FFD200]" /> Key pool</h2>
        {tokens.length === 0 ? (
          <p className="text-[#555555] text-sm">No keys configured.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[#555555]"><th className="py-2">Key</th><th>Today</th><th>Status</th></tr></thead>
            <tbody>
              {fps.map((fp, i) => {
                const st = stateBy.get(fp) as any;
                const u = usageBy.get(fp) as any;
                const blocked = st?.exhausted_until && new Date(st.exhausted_until) > new Date();
                return (
                  <tr key={fp} className="border-t border-[#1E1E1E] text-[#CCCCCC]">
                    <td className="py-2 font-mono text-xs">#{i + 1} · {fp}</td>
                    <td>{u ? `${u.clips} clips · ${formatSeconds(Number(u.seconds))}` : "—"}</td>
                    <td>
                      {blocked ? (
                        <span className="text-[#FF3B3B]" title={st.last_error || ""}>quota used until {new Date(st.exhausted_until).toLocaleTimeString()}</span>
                      ) : (
                        <span className="text-[#22C55E]">available</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <p className="text-[#555555] text-xs mt-3">Only a fingerprint of each key is shown or stored.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
          <h2 className="text-white font-semibold text-sm mb-4">Usage by user (this month)</h2>
          {perUser.size === 0 ? <p className="text-[#555555] text-sm">No usage yet.</p> : (
            <ul className="space-y-2 text-sm">
              {Array.from(perUser.entries()).sort((a, b) => b[1].seconds - a[1].seconds).slice(0, 20).map(([id, e]) => {
                const p = who.get(id) as any;
                const allowance = LIPSYNC_SECONDS_PER_MONTH[p?.subscription_plan || "free"] || 0;
                return (
                  <li key={id} className="flex justify-between gap-3 text-[#CCCCCC]">
                    <span className="truncate">{p?.email || id.slice(0, 8)} <span className="text-[#555555] text-xs">{p?.subscription_plan || "?"}</span></span>
                    <span className="shrink-0">{formatSeconds(e.seconds)}{allowance ? ` / ${formatSeconds(allowance)}` : ""} · {e.clips} clips{e.failed ? ` · ${e.failed} failed` : ""}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
          <h2 className="text-white font-semibold text-sm mb-4 flex items-center gap-2"><Clapperboard className="w-4 h-4 text-[#FFD200]" /> Recent jobs</h2>
          {!tablesReady || !(runs.data || []).length ? <p className="text-[#555555] text-sm">No jobs yet.</p> : (
            <ul className="space-y-2 text-sm">
              {(runs.data as any[]).map((r) => (
                <li key={r.id} className="flex justify-between gap-3 text-[#CCCCCC]">
                  <span className="truncate">{(who.get(r.user_id) as any)?.email || r.user_id?.slice(0, 8)} · {new Date(r.created_at).toLocaleDateString()}</span>
                  <span className="shrink-0">{r.done_count}/{r.clip_count} · {formatSeconds(Number(r.total_seconds))} · <span className={r.status === "complete" ? "text-[#22C55E]" : r.status === "failed" ? "text-[#FF3B3B]" : "text-[#FFD200]"}>{r.status}</span></span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
