import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/admin-exemption";

type ServiceResult = {
  name: string;
  status: "ok" | "down" | "degraded";
  ms: number;
  error?: string;
};

async function ping(name: string, fn: () => Promise<unknown>): Promise<ServiceResult> {
  const start = Date.now();
  try {
    await fn();
    const ms = Date.now() - start;
    return { name, status: ms > 5000 ? "degraded" : "ok", ms };
  } catch (err) {
    return {
      name,
      status: "down",
      ms: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const svc = await createServiceClient();

  const checks = await Promise.allSettled([
    ping("Supabase DB", async () => {
      const { error } = await svc.from("profiles").select("id").limit(1);
      if (error) throw error;
    }),
    ping("YouTube API", async () => {
      if (!process.env.YOUTUBE_API_KEY) throw new Error("Key not configured");
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=id&q=test&key=${process.env.YOUTUBE_API_KEY}&maxResults=1`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    }),
    ping("OpenAI", async () => {
      if (!process.env.OPENAI_API_KEY) throw new Error("Key not configured");
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    }),
    ping("Anthropic", async () => {
      if (!process.env.ANTHROPIC_API_KEY) throw new Error("Key not configured");
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1,
          messages: [{ role: "user", content: "ping" }],
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok && res.status !== 400) throw new Error(`HTTP ${res.status}`);
    }),
    ping("HuggingFace", async () => {
      if (!process.env.HUGGINGFACE_API_KEY) throw new Error("Key not configured");
      const res = await fetch(
        "https://huggingface.co/api/models/stabilityai/stable-diffusion-xl-base-1.0",
        {
          headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` },
          signal: AbortSignal.timeout(8000),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    }),
    ping("Railway (FFmpeg)", async () => {
      const url = process.env.NEXT_PUBLIC_FFMPEG_SERVICE_URL;
      if (!url) throw new Error("Not configured");
      const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    }),
    ping("Resend", async () => {
      if (!process.env.RESEND_API_KEY) throw new Error("Key not configured");
      const res = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    }),
    ping("Pexels", async () => {
      if (!process.env.PEXELS_API_KEY) throw new Error("Key not configured");
      const res = await fetch(
        "https://api.pexels.com/v1/search?query=test&per_page=1",
        {
          headers: { Authorization: process.env.PEXELS_API_KEY },
          signal: AbortSignal.timeout(8000),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    }),
  ]);

  const services: ServiceResult[] = checks.map((r) =>
    r.status === "fulfilled" ? r.value : { name: "unknown", status: "down", ms: 0 }
  );

  // Persist health log
  await Promise.allSettled(
    services.map((s) =>
      svc.from("system_health_log").insert({
        service: s.name,
        status: s.status,
        response_time_ms: s.ms,
        error_message: s.error || null,
      })
    )
  );

  return NextResponse.json({ services, checked_at: new Date().toISOString() });
}
