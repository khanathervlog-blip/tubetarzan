import type { KnowledgeChunk } from "./support-rag";

/**
 * In-memory caches for the support agent. They live in the warm server instance (Vercel Fluid reuses
 * instances across requests), cost nothing to read, and simply start empty on a cold start.
 *
 * PRIVACY: the answer cache is only used for the FIRST message of a chat conversation. That reply is built
 * purely from the generic system prompt + the public knowledge base - no user id, email, history or account
 * data goes into it - so sharing it between visitors cannot leak anything. Follow-up messages (which depend
 * on that visitor's conversation) and email replies are never cached here.
 */

// ---- answer cache (first chat message only) ---------------------------------------------------------------
const ANSWER_TTL_MS = 60 * 60 * 1000; // 1 hour
const ANSWER_MAX_ENTRIES = 300;

interface CachedAnswer {
  reply: string;
  needsEscalation: boolean;
  chunks: KnowledgeChunk[];
  expiresAt: number;
}

const answers = new Map<string, CachedAnswer>();

export function normalizeQuestion(message: string): string {
  return message
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

export function getCachedAnswer(message: string): CachedAnswer | null {
  const key = normalizeQuestion(message);
  if (!key) return null;
  const hit = answers.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    answers.delete(key);
    return null;
  }
  return hit;
}

export function setCachedAnswer(
  message: string,
  value: { reply: string; needsEscalation: boolean; chunks: KnowledgeChunk[] }
) {
  const key = normalizeQuestion(message);
  if (!key || value.needsEscalation) return; // never cache escalations
  if (answers.size >= ANSWER_MAX_ENTRIES) {
    const oldest = answers.keys().next().value;
    if (oldest !== undefined) answers.delete(oldest);
  }
  answers.set(key, { ...value, expiresAt: Date.now() + ANSWER_TTL_MS });
}

/** Call after the knowledge base changes so stale answers aren't served from this instance. */
export function clearSupportAnswerCache() {
  answers.clear();
}

// ---- settings cache ---------------------------------------------------------------------------------------
const SETTINGS_TTL_MS = 5 * 60 * 1000;
let thresholdCache: { value: number; expiresAt: number } | null = null;

export function getCachedThreshold(): number | null {
  return thresholdCache && thresholdCache.expiresAt > Date.now() ? thresholdCache.value : null;
}

export function setCachedThreshold(value: number) {
  thresholdCache = { value, expiresAt: Date.now() + SETTINGS_TTL_MS };
}

// ---- rate limit for the public chat endpoint --------------------------------------------------------------
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_REQUESTS = 30;
const hits = new Map<string, number[]>();

/** Returns false when this client has sent too many chat messages recently. */
export function allowChatRequest(clientKey: string): boolean {
  const now = Date.now();
  const recent = (hits.get(clientKey) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX_REQUESTS) {
    hits.set(clientKey, recent);
    return false;
  }
  recent.push(now);
  hits.set(clientKey, recent);

  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (!v.some((t) => now - t < RATE_WINDOW_MS)) hits.delete(k);
    }
  }
  return true;
}
