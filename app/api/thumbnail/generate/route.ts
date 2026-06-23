import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const STYLES: Record<string, string> = {
  dramatic: "dramatic cinematic YouTube thumbnail, intense lighting, bold colors, high contrast",
  clean: "clean minimal YouTube thumbnail, white background, professional design, clear text layout",
  gradient: "vibrant gradient background YouTube thumbnail, colorful, eye-catching, modern design",
  bold: "bold text overlay YouTube thumbnail, large typography, attention-grabbing, high contrast colors",
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = await createServiceClient();
  const { data: profileRaw } = await svc
    .from("profiles")
    .select("subscription_plan, email")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as { subscription_plan: string; email: string } | null;

  const isAdmin = (process.env.ADMIN_EMAIL || "").split(",").map(e => e.trim()).includes(profile?.email || "");
  const plan = profile?.subscription_plan || "free";
  if (plan === "free" && !isAdmin) {
    return NextResponse.json({ error: "Thumbnail generation requires Creator plan or above", upgradeRequired: true }, { status: 403 });
  }

  const hfKey = process.env.HUGGINGFACE_API_KEY;
  if (!hfKey) {
    return NextResponse.json({
      error: "HuggingFace API not configured. Add HUGGINGFACE_API_KEY to your environment variables.",
      configMissing: true,
    }, { status: 503 });
  }

  const { title, style = "dramatic", subject = "" } = await request.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const stylePrompt = STYLES[style] || STYLES.dramatic;
  const basePrompt = `${stylePrompt}, video about: ${title}${subject ? `, featuring: ${subject}` : ""}, 1280x720 YouTube thumbnail, no watermarks, photorealistic`;

  const seeds = [42, 123, 456, 789];
  const images: string[] = [];

  for (const seed of seeds) {
    try {
      const res = await fetch(
        "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${hfKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: basePrompt,
            parameters: {
              seed,
              num_inference_steps: 20,
              width: 1280,
              height: 720,
            },
          }),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        if (errText.includes("loading")) {
          images.push("");
          continue;
        }
        throw new Error(`HuggingFace error: ${res.status} — ${errText.slice(0, 200)}`);
      }

      const blob = await res.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      images.push(`data:image/png;base64,${base64}`);
    } catch (err) {
      images.push("");
      console.error(`Seed ${seed} failed:`, err);
    }
  }

  const successfulImages = images.filter(Boolean);
  if (!successfulImages.length) {
    return NextResponse.json({
      error: "The AI model is warming up. Please try again in 20 seconds.",
      modelLoading: true,
    }, { status: 503 });
  }

  return NextResponse.json({ images, prompt: basePrompt, style, title });
}
