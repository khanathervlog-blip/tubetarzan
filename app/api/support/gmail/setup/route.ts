import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setupGmailWatch } from "@/lib/support-gmail";
import { verifyCronRequest } from "@/lib/cron-auth";

// Vercel Cron always issues GET requests, so the weekly renewal in vercel.json needs a GET handler.
export async function GET(req: NextRequest) {
  if (!verifyCronRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return renewWatch();
}

export async function POST(req: NextRequest) {
  // Allow both admin UI calls and cron calls
  const authHeader = req.headers.get("authorization");
  const isCron = !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!isCron) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminEmails = (process.env.ADMIN_EMAIL || "").split(",").map((e) => e.trim());
    if (!adminEmails.includes(user.email || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return renewWatch();
}

async function renewWatch() {
  // Check required env vars before attempting
  const missing = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN", "GOOGLE_PUBSUB_TOPIC"].filter(
    (k) => !process.env[k]
  );
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing env vars: ${missing.join(", ")}` },
      { status: 500 }
    );
  }

  try {
    await setupGmailWatch();
    return NextResponse.json({ success: true, message: "Gmail watch active. Expires in 7 days." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Gmail watch setup failed:", message);
    return NextResponse.json({ error: `Gmail API error: ${message}` }, { status: 500 });
  }
}
