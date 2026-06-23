import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

function verifyCron(request: Request): boolean {
  const vercelCron = request.headers.get("x-vercel-cron");
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  return !!(vercelCron || (secret && auth === `Bearer ${secret}`));
}

type PingStatus = "ok" | "degraded" | "down";

async function ping(
  name: string,
  fn: () => Promise<Response | null>
): Promise<{ name: string; status: PingStatus; ms: number; error?: string }> {
  const start = Date.now();
  try {
    const res = await fn();
    const ms = Date.now() - start;
    if (!res || !res.ok) return { name, status: "down", ms, error: `HTTP ${res?.status}` };
    return { name, status: ms > 3000 ? "degraded" : "ok", ms };
  } catch (err) {
    return { name, status: "down", ms: Date.now() - start, error: err instanceof Error ? err.message : "error" };
  }
}

export async function GET(request: Request) {
  if (!verifyCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = await createServiceClient();

  const results = await Promise.all([
    ping("Supabase DB", async () => {
      const { error } = await svc.from("profiles").select("id").limit(1);
      return error ? null : new Response("ok");
    }),
    ping("YouTube API", () =>
      fetch(
        `https://www.googleapis.com/youtube/v3/i18nLanguages?part=snippet&hl=en&key=${process.env.YOUTUBE_API_KEY}`,
        { signal: AbortSignal.timeout(8000) }
      )
    ),
    ping("OpenAI", () =>
      fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        signal: AbortSignal.timeout(8000),
      })
    ),
    ping("Anthropic", () =>
      fetch("https://api.anthropic.com/v1/models", {
        headers: { "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01" },
        signal: AbortSignal.timeout(8000),
      })
    ),
  ]);

  try {
    await Promise.all(
      results.map((r) =>
        svc.from("system_health_log").insert({
          checked_at: new Date().toISOString(),
          service: r.name,
          status: r.status,
          response_time_ms: r.ms,
          error_message: r.error || null,
        })
      )
    );
  } catch { /* ignore if table not yet created */ }

  const overall = results.every((r) => r.status === "ok")
    ? "ok"
    : results.some((r) => r.status === "down")
    ? "degraded"
    : "ok";

  return NextResponse.json({ checked: results.length, overall, results });
}
