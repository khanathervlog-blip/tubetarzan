/** Free Google Translate (the same endpoint the Google Translate website/extension uses), called from the visitor's browser. */
const ENDPOINT = "https://translate.googleapis.com/translate_a/single";

async function call(text: string, from: string, to: string): Promise<string> {
  const res = await fetch(`${ENDPOINT}?client=gtx&sl=${from}&tl=${to}&dt=t`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({ q: text }),
  });
  if (!res.ok) throw new Error(`Google Translate returned ${res.status}`);
  const j = (await res.json()) as [Array<[string]>];
  return (j[0] || []).map((s) => s[0] || "").join("");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let last: unknown;
  for (let i = 0; i < 3; i++) {
    try { return await fn(); } catch (e) { last = e; await sleep(800 * (i + 1)); }
  }
  throw last;
}

/** Translates caption lines, keeping exactly one output line per input line (timestamps stay aligned). */
export async function translateLines(lines: string[], from: string, to: string): Promise<string[]> {
  const out: string[] = [];
  // batches of ~30 lines joined by newlines; if the line count comes back different, fall back to one request per line
  for (let i = 0; i < lines.length; i += 30) {
    const batch = lines.slice(i, i + 30).map((l) => l.replace(/\s*\n\s*/g, " "));
    const joined = await withRetry(() => call(batch.join("\n"), from, to));
    const parts = joined.split("\n").map((p) => p.trim());
    if (parts.length === batch.length) out.push(...parts);
    else for (const l of batch) out.push((await withRetry(() => call(l, from, to))).trim());
  }
  return out;
}
