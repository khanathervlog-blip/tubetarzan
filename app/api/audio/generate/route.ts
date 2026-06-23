import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const GOOGLE_TTS_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";

const VOICES = {
  "en-US": [
    { name: "en-US-Neural2-A", label: "English (US) — Male A", gender: "MALE" },
    { name: "en-US-Neural2-C", label: "English (US) — Female C", gender: "FEMALE" },
    { name: "en-US-Neural2-D", label: "English (US) — Male D", gender: "MALE" },
    { name: "en-US-Neural2-F", label: "English (US) — Female F", gender: "FEMALE" },
    { name: "en-US-Neural2-J", label: "English (US) — Male J", gender: "MALE" },
  ],
  "ur-PK": [
    { name: "ur-PK-Wavenet-A", label: "Urdu — Female A", gender: "FEMALE" },
    { name: "ur-PK-Wavenet-B", label: "Urdu — Male B", gender: "MALE" },
  ],
  "hi-IN": [
    { name: "hi-IN-Neural2-A", label: "Hindi — Female A", gender: "FEMALE" },
    { name: "hi-IN-Neural2-B", label: "Hindi — Male B", gender: "MALE" },
    { name: "hi-IN-Neural2-C", label: "Hindi — Male C", gender: "MALE" },
    { name: "hi-IN-Neural2-D", label: "Hindi — Female D", gender: "FEMALE" },
  ],
  "ar-XA": [
    { name: "ar-XA-Wavenet-A", label: "Arabic — Female A", gender: "FEMALE" },
    { name: "ar-XA-Wavenet-B", label: "Arabic — Male B", gender: "MALE" },
    { name: "ar-XA-Wavenet-C", label: "Arabic — Male C", gender: "MALE" },
  ],
};

function splitIntoChunks(text: string, maxChars = 4800): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let current = "";

  for (const sentence of sentences) {
    if (!sentence.trim()) continue;
    if (current.length + sentence.length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = sentence + " ";
    } else {
      current += sentence + " ";
    }
  }
  if (current.trim()) chunks.push(current.trim());

  if (chunks.length === 0 && text.trim()) {
    for (let i = 0; i < text.length; i += maxChars) {
      chunks.push(text.slice(i, i + maxChars));
    }
  }

  return chunks;
}

export async function GET() {
  return NextResponse.json({ voices: VOICES });
}

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
      { error: "Audio generation requires Creator plan or above", upgradeRequired: true },
      { status: 403 }
    );
  }

  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Google TTS not configured. Add GOOGLE_TTS_API_KEY to your environment variables (enable Cloud Text-to-Speech API in Google Cloud Console).",
        configMissing: true,
      },
      { status: 503 }
    );
  }

  const {
    text,
    voiceName,
    languageCode,
    speakingRate = 1.0,
    pitch = 0.0,
  } = await request.json();

  if (!text?.trim()) return NextResponse.json({ error: "Text is required" }, { status: 400 });
  if (!voiceName || !languageCode)
    return NextResponse.json({ error: "Voice and language are required" }, { status: 400 });

  const chunks = splitIntoChunks(text.trim());
  if (!chunks.length)
    return NextResponse.json({ error: "No text to convert" }, { status: 400 });

  try {
    const audioChunks: string[] = [];

    for (const chunk of chunks) {
      const body = {
        input: { text: chunk },
        voice: { languageCode, name: voiceName },
        audioConfig: {
          audioEncoding: "MP3",
          speakingRate: Math.min(Math.max(speakingRate, 0.25), 4.0),
          pitch: Math.min(Math.max(pitch, -20), 20),
        },
      };

      const res = await fetch(`${GOOGLE_TTS_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || `TTS API error: ${res.status}`);
      }

      const data = await res.json();
      if (!data.audioContent) throw new Error("No audio returned from TTS API");
      audioChunks.push(data.audioContent as string);
    }

    return NextResponse.json({
      audioChunks,
      charCount: text.length,
      chunkCount: audioChunks.length,
      voiceName,
      languageCode,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Audio generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
