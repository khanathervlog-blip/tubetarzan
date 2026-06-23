import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// Kling AI API — text-to-video generation
// Docs: https://klingai.com/developer — update endpoint if their API version changes
const KLING_BASE = "https://api.klingai.com/v1";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = await createServiceClient();
  const { data: profile } = await svc
    .from("profiles")
    .select("subscription_plan, email")
    .eq("id", user.id)
    .single();

  const isAdmin = (process.env.ADMIN_EMAIL || "")
    .split(",")
    .map((e) => e.trim())
    .includes(profile?.email || "");
  const plan = (profile?.subscription_plan as string) || "free";

  if (plan === "free" && !isAdmin) {
    return NextResponse.json(
      { error: "Kling AI B-roll requires Creator plan or above", upgradeRequired: true },
      { status: 403 }
    );
  }

  const apiKey = process.env.KLING_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "Kling AI not configured. Add KLING_API_KEY to environment variables.",
        configMissing: true,
      },
      { status: 503 }
    );
  }

  const { prompt, duration = "5", aspectRatio = "16:9" } = await request.json();
  if (!prompt?.trim()) return NextResponse.json({ error: "Prompt required" }, { status: 400 });

  try {
    const res = await fetch(`${KLING_BASE}/videos/text2video`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "kling-v1",
        prompt: prompt.trim(),
        negative_prompt: "watermark, text, logo, blurry, low quality, nsfw",
        cfg_scale: 0.5,
        mode: "std",
        duration,
        aspect_ratio: aspectRatio,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || err.error || `Kling API error: ${res.status}`);
    }

    const data = await res.json();
    const taskId = data.data?.task_id || data.task_id;

    if (!taskId) throw new Error("No task ID returned from Kling AI");

    return NextResponse.json({ taskId, status: "submitted" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kling AI request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Poll task status
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("taskId");
  if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });

  const apiKey = process.env.KLING_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Kling AI not configured" }, { status: 503 });

  try {
    const res = await fetch(`${KLING_BASE}/videos/text2video/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      throw new Error(`Failed to check task status: ${res.status}`);
    }

    const data = await res.json();
    const taskData = data.data || data;
    const status: string = taskData.task_status || "processing";
    const videos = taskData.task_result?.videos || [];
    const videoUrl: string | null = videos[0]?.url || null;

    return NextResponse.json({
      taskId,
      status, // "processing" | "succeed" | "failed"
      videoUrl,
      progress: status === "succeed" ? 100 : status === "failed" ? 0 : 50,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to check task status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
