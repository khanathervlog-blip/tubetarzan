import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import type { Profile } from "@/types/database";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminEmails = (process.env.ADMIN_EMAIL || "").split(",").map(e => e.trim());
  if (!adminEmails.includes(user.email || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json() as {
    segment: string;
    subject: string;
    body: string;
    testOnly?: boolean;
    testEmail?: string;
  };

  const { segment, subject, body: emailBody, testOnly, testEmail } = body;
  if (!subject?.trim() || !emailBody?.trim()) {
    return NextResponse.json({ error: "Subject and body are required" }, { status: 400 });
  }

  // Test send
  if (testOnly) {
    const to = testEmail || user.email || adminEmails[0];
    await resend.emails.send({
      from: "TubeTarzan <noreply@tubetarzan.com>",
      to,
      subject: `[TEST] ${subject}`,
      html: formatEmailHtml(subject, emailBody),
    });
    return NextResponse.json({ sent: 1, test: true });
  }

  // Get recipients based on segment
  const svc = await createServiceClient();
  let query = svc.from("profiles").select("email, subscription_plan, subscription_status");

  if (segment === "free") {
    query = query.or("subscription_plan.is.null,subscription_plan.eq.free");
  } else if (segment === "creator") {
    query = query.eq("subscription_plan", "creator");
  } else if (segment === "pro") {
    query = query.eq("subscription_plan", "pro");
  } else if (segment === "agency") {
    query = query.eq("subscription_plan", "agency");
  } else if (segment === "trial") {
    query = query.eq("subscription_status", "trialing");
  } else if (segment === "paid") {
    query = query.in("subscription_plan", ["creator", "pro", "agency"])
      .eq("subscription_status", "active");
  }
  // "all" — no additional filter

  const { data: profiles, error } = await query.limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const recipients = (profiles as Pick<Profile, "email">[] | null)
    ?.map(p => p.email)
    .filter(Boolean) || [];

  if (recipients.length === 0) {
    return NextResponse.json({ sent: 0, message: "No recipients in this segment" });
  }

  // Send in batches of 50 (Resend batch limit)
  const BATCH = 50;
  let sent = 0;
  for (let i = 0; i < recipients.length; i += BATCH) {
    const batch = recipients.slice(i, i + BATCH);
    await Promise.allSettled(
      batch.map(email =>
        resend.emails.send({
          from: "TubeTarzan <noreply@tubetarzan.com>",
          to: email,
          subject,
          html: formatEmailHtml(subject, emailBody),
        })
      )
    );
    sent += batch.length;
  }

  return NextResponse.json({ sent, total: recipients.length });
}

function formatEmailHtml(subject: string, body: string): string {
  const paragraphs = body
    .split("\n")
    .filter(l => l.trim())
    .map(l => `<p style="margin:0 0 16px;color:#cccccc;line-height:1.6;">${l}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#080808;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:40px 20px;">
  <div style="max-width:600px;margin:0 auto;background:#111111;border:1px solid #1e1e1e;border-radius:12px;overflow:hidden;">
    <div style="background:#111111;padding:24px 32px;border-bottom:1px solid #1e1e1e;">
      <span style="color:#FFD200;font-weight:700;font-size:16px;">⚡ TubeTarzan</span>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#ffffff;font-size:20px;font-weight:700;margin:0 0 20px;">${subject}</h2>
      ${paragraphs}
    </div>
    <div style="padding:20px 32px;border-top:1px solid #1e1e1e;">
      <p style="color:#555555;font-size:12px;margin:0;">
        You're receiving this because you're a TubeTarzan user.
        Questions? <a href="mailto:support@tubetarzan.com" style="color:#FFD200;">support@tubetarzan.com</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}
