import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setupGmailWatch } from "@/lib/support-gmail";

export async function POST(req: NextRequest) {
  // Allow both admin UI calls and Vercel cron calls
  const authHeader = req.headers.get("authorization");
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!isCron) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminEmails = (process.env.ADMIN_EMAIL || "").split(",").map((e) => e.trim());
    if (!adminEmails.includes(user.email || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  await setupGmailWatch();
  return NextResponse.json({ success: true, message: "Gmail watch renewed. Expires in 7 days." });
}
