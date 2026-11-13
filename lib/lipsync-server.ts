/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash } from "crypto";
import { createServiceClient } from "./supabase/server";
import { isAdminEmail } from "./admin-exemption";
import {
  LIPSYNC_SECONDS_PER_MONTH,
  LIPSYNC_MAX_RUN_SECONDS,
  LIPSYNC_MAX_RUN_SECONDS_ADMIN,
  LIPSYNC_DAILY_SECONDS_PER_KEY,
} from "./plans";

/**
 * Server side of Lip Sync.
 *
 * The heavy work happens elsewhere for free:
 *  - the BROWSER cuts the video/audio into clips of at most 60 seconds (ffmpeg.wasm) and uploads them
 *    straight to Supabase Storage with one-time signed upload URLs;
 *  - a Hugging Face ZeroGPU Space (hf-space/ in this repo) downloads one clip, lip-syncs it on a GPU and
 *    uploads the result straight back to Supabase Storage.
 * Vercel only hands out signed URLs and waits for the Space, so it uses almost no CPU.
 *
 * GPU time comes from a pool of Hugging Face accounts: HF_TOKENS="hf_aaa,hf_bbb,...". Each account has its
 * own daily ZeroGPU quota; when one runs out we remember it (by fingerprint, never the token) and move on.
 */

export const LIPSYNC_BUCKET = "lipsync";

export function hfTokens(): string[] {
  const raw = process.env.HF_TOKENS || process.env.HF_TOKEN || "";
  return Array.from(new Set(raw.split(/[\s,;]+/).map((t) => t.trim()).filter((t) => t.startsWith("hf_"))));
}

export function keyFingerprint(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 12);
}

export function spaceReference(): string | null {
  const v = (process.env.HF_LIPSYNC_SPACE_URL || "").trim();
  if (!v) return null;
  // Accept "user/space", "https://huggingface.co/spaces/user/space" or "https://user-space.hf.space"
  const m = /huggingface\.co\/spaces\/([^/?#]+\/[^/?#]+)/.exec(v);
  return m ? m[1] : v.replace(/\/+$/, "");
}

/** Switch that opens Lip Sync to paid plans (and shows the minutes on the pricing page). */
export function lipsyncOpenToPaidPlans(): boolean {
  return process.env.NEXT_PUBLIC_LIPSYNC_PAID === "true";
}

export function lipsyncConfigured(): boolean {
  return !!spaceReference() && hfTokens().length > 0;
}

export interface LipsyncAccess {
  allowed: boolean;
  isAdmin: boolean;
  plan: string;
  status: string;
  allowanceSeconds: number | null; // null = unlimited (admin)
  usedSeconds: number;
  remainingSeconds: number | null;
  maxRunSeconds: number;
  configured: boolean;
  /** Daily GPU safety budget of the whole key pool (video seconds), today's use, and what is left today. */
  poolBudgetSeconds: number;
  poolUsedTodaySeconds: number;
  poolRemainingSeconds: number;
  reason?: string;
}

function startOfMonthIso(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

/** Video seconds each key may spend per day (env override wins; see lib/plans.ts). */
export function dailySecondsPerKey(): number {
  const v = Number(process.env.LIPSYNC_DAILY_SECONDS_PER_KEY);
  return Number.isFinite(v) && v > 0 ? v : LIPSYNC_DAILY_SECONDS_PER_KEY;
}

/** Today's pool state: budget = keys × per-key seconds; used = lipsync_key_usage rows of today. */
export async function getPoolToday(): Promise<{ budget: number; used: number; remaining: number }> {
  const tokens = hfTokens();
  const budget = tokens.length * dailySecondsPerKey();
  if (!tokens.length) return { budget: 0, used: 0, remaining: 0 };
  const svc = await createServiceClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await svc
    .from("lipsync_key_usage")
    .select("seconds")
    .eq("day", today)
    .in("key_fp", tokens.map(keyFingerprint));
  const used = (data || []).reduce((s: number, u: any) => s + Number(u.seconds || 0), 0);
  return { budget, used, remaining: Math.max(0, budget - used) };
}

/** Who may use Lip Sync and how many seconds they have left this month. */
export async function getLipsyncAccess(userId: string, email: string | null | undefined): Promise<LipsyncAccess> {
  const svc = await createServiceClient();
  const isAdmin = !!email && isAdminEmail(email);

  const { data: profile } = await svc
    .from("profiles")
    .select("subscription_plan, subscription_status")
    .eq("id", userId)
    .single();
  const plan = (profile?.subscription_plan as string) || "free";
  const status = (profile?.subscription_status as string) || "inactive";

  const [{ data: clips }, pool] = await Promise.all([
    svc
      .from("lipsync_clips")
      .select("duration_sec, status")
      .eq("user_id", userId)
      .gte("created_at", startOfMonthIso())
      .neq("status", "failed"),
    getPoolToday(),
  ]);
  const usedSeconds = (clips || []).reduce((s: number, c: any) => s + Number(c.duration_sec || 0), 0);

  const base = {
    isAdmin,
    plan,
    status,
    usedSeconds,
    configured: lipsyncConfigured(),
    poolBudgetSeconds: pool.budget,
    poolUsedTodaySeconds: pool.used,
    poolRemainingSeconds: pool.remaining,
  };

  if (isAdmin) {
    // Admin has no monthly allowance, but the daily GPU safety budget of the key pool still applies.
    return {
      ...base,
      allowed: true,
      allowanceSeconds: null,
      remainingSeconds: null,
      maxRunSeconds: Math.min(LIPSYNC_MAX_RUN_SECONDS_ADMIN, pool.remaining),
      reason: pool.remaining <= 0 && base.configured ? "daily_gpu_budget" : undefined,
    };
  }

  // Paid plans get Lip Sync only once a commercially licensed engine is connected (see hf-space/README.md)
  if (!lipsyncOpenToPaidPlans()) {
    return { ...base, allowed: false, allowanceSeconds: 0, remainingSeconds: 0, maxRunSeconds: 0, reason: "coming_soon" };
  }
  const allowanceSeconds = LIPSYNC_SECONDS_PER_MONTH[plan] ?? 0;
  if (allowanceSeconds <= 0) {
    return { ...base, allowed: false, allowanceSeconds: 0, remainingSeconds: 0, maxRunSeconds: 0, reason: "upgrade_required" };
  }
  // Paying customers only: free trials don't include Lip Sync (it spends real GPU time)
  if (status !== "active") {
    return {
      ...base,
      allowed: false,
      allowanceSeconds,
      remainingSeconds: 0,
      maxRunSeconds: 0,
      reason: status === "trialing" ? "trial_not_included" : "subscription_inactive",
    };
  }
  const remainingSeconds = Math.max(0, allowanceSeconds - usedSeconds);
  return {
    ...base,
    allowed: true,
    allowanceSeconds,
    remainingSeconds,
    maxRunSeconds: Math.min(LIPSYNC_MAX_RUN_SECONDS, remainingSeconds, pool.remaining),
  };
}

// ── key pool ────────────────────────────────────────────────────────────────────────────────────────────

async function orderedKeys(): Promise<{ token: string; fp: string }[]> {
  const tokens = hfTokens();
  if (!tokens.length) return [];
  const svc = await createServiceClient();
  const fps = tokens.map(keyFingerprint);
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: states }, { data: usage }] = await Promise.all([
    svc.from("lipsync_key_state").select("key_fp, exhausted_until").in("key_fp", fps),
    svc.from("lipsync_key_usage").select("key_fp, seconds").eq("day", today).in("key_fp", fps),
  ]);
  const blocked = new Set(
    (states || []).filter((s: any) => s.exhausted_until && new Date(s.exhausted_until) > new Date()).map((s: any) => s.key_fp)
  );
  const used = new Map<string, number>((usage || []).map((u: any) => [u.key_fp, Number(u.seconds || 0)]));
  return tokens
    .map((token, i) => ({ token, fp: fps[i] }))
    .filter((k) => !blocked.has(k.fp))
    .sort((a, b) => (used.get(a.fp) || 0) - (used.get(b.fp) || 0)); // spread the work over the accounts
}

function isQuotaError(msg: string): boolean {
  return /quota|exceeded|GPU limit|too many requests|429/i.test(msg);
}

/** "…Try again in 12:34:56" → that many ms; otherwise 24 hours. */
function retryAfterMs(msg: string): number {
  const m = /(\d{1,2}):(\d{2}):(\d{2})/.exec(msg);
  if (m) return ((+m[1] * 60 + +m[2]) * 60 + +m[3]) * 1000 + 60_000;
  return 24 * 60 * 60 * 1000;
}

async function markExhausted(fp: string, msg: string) {
  const svc = await createServiceClient();
  await svc.from("lipsync_key_state").upsert({
    key_fp: fp,
    exhausted_until: new Date(Date.now() + retryAfterMs(msg)).toISOString(),
    last_error: msg.slice(0, 300),
    updated_at: new Date().toISOString(),
  });
}

export type SpaceResult =
  | { ok: true; keyFp: string }
  | { ok: false; paused: true; error: string }
  | { ok: false; paused: false; error: string };

/**
 * Lip-syncs one clip: the Space downloads video_url + audio_url, runs the model and PUTs the mp4 to upload_url.
 * Tries the pool's keys in order until one has quota left.
 */
export async function runOnSpace(args: { videoUrl: string; audioUrl: string; uploadUrl: string; seconds: number }): Promise<SpaceResult> {
  const space = spaceReference();
  if (!space) return { ok: false, paused: false, error: "Lip Sync GPU is not configured yet (HF_LIPSYNC_SPACE_URL)." };
  const keys = await orderedKeys();
  if (!keys.length) {
    return hfTokens().length
      ? { ok: false, paused: true, error: "Today's free GPU time is used up on all accounts. Continue later." }
      : { ok: false, paused: false, error: "Lip Sync GPU is not configured yet (HF_TOKENS)." };
  }

  const { Client } = await import("@gradio/client");
  let lastError = "Unknown error";
  for (const key of keys) {
    try {
      const client = await Client.connect(space, { token: key.token as `hf_${string}` });
      const res = await client.predict("/run_lipsync", {
        video_url: args.videoUrl,
        audio_url: args.audioUrl,
        upload_url: args.uploadUrl,
      });
      const raw = Array.isArray(res.data) ? res.data[0] : res.data;
      let parsed: { ok?: boolean; error?: string } = {};
      try {
        parsed = typeof raw === "string" ? JSON.parse(raw) : (raw as any) || {};
      } catch {
        parsed = { ok: false, error: String(raw).slice(0, 300) };
      }
      if (!parsed.ok) {
        const msg = parsed.error || "The GPU worker could not process this clip.";
        if (isQuotaError(msg)) {
          await markExhausted(key.fp, msg);
          lastError = msg;
          continue;
        }
        return { ok: false, paused: false, error: msg };
      }
      const svc = await createServiceClient();
      await svc.rpc("lipsync_record_key_use", { p_fp: key.fp, p_seconds: args.seconds });
      return { ok: true, keyFp: key.fp };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String((err as any)?.message || err);
      lastError = msg;
      if (isQuotaError(msg)) {
        await markExhausted(key.fp, msg);
        continue;
      }
      // Space asleep / building / network: try the next account once, then give up for now
      if (/sleep|building|starting|fetch failed|ECONN|timeout|503|502/i.test(msg)) continue;
      return { ok: false, paused: false, error: msg.slice(0, 300) };
    }
  }
  return { ok: false, paused: true, error: isQuotaError(lastError)
    ? "Today's free GPU time is used up on all accounts. Continue later."
    : `GPU worker unavailable right now (${lastError.slice(0, 160)}). Try again in a few minutes.` };
}
