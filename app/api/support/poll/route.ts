import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getEmailContent } from "@/lib/support-gmail";
import { runSupportPipeline } from "@/lib/support-pipeline";
import { createClient, createServiceClient } from "@/lib/supabase/server";

function getGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const isCron = process.env.CRON_SECRET
    ? auth === `Bearer ${process.env.CRON_SECRET}`
    : req.headers.get("x-vercel-cron") === "1";

  if (!isCron) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const adminEmails = (process.env.ADMIN_EMAIL || "").split(",").map(e => e.trim());
    if (!adminEmails.includes(user.email || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    const gmail = getGmailClient();
    const supabase = await createServiceClient();

    const { data: setting } = await supabase
      .from("support_settings")
      .select("value")
      .eq("key", "last_gmail_message_id")
      .single();

    const lastId = (setting as { value: string } | null)?.value || null;

    const listRes = await gmail.users.messages.list({
      userId: "me",
      labelIds: ["INBOX", "UNREAD"],
      maxResults: 10,
    });

    const messages = listRes.data.messages || [];
    if (messages.length === 0) return NextResponse.json({ processed: 0 });

    let newMessages = messages;
    if (lastId) {
      const lastIndex = messages.findIndex(m => m.id === lastId);
      if (lastIndex !== -1) newMessages = messages.slice(0, lastIndex);
    }

    if (newMessages.length === 0) return NextResponse.json({ processed: 0 });

    await supabase
      .from("support_settings")
      .upsert({ key: "last_gmail_message_id", value: messages[0].id as string });

    let processed = 0;
    for (const msg of newMessages) {
      if (!msg.id) continue;
      const email = await getEmailContent(msg.id);
      if (!email) continue;

      if (
        email.fromEmail.includes("tubetarzan.com") ||
        email.fromEmail.includes("noreply@") ||
        email.fromEmail.includes("no-reply@") ||
        email.fromEmail.includes("mailer-daemon") ||
        email.fromEmail.includes("postmaster@")
      ) continue;

      if (!email.body || email.body.trim().length < 5) continue;

      const { data: existing } = await supabase
        .from("support_conversations")
        .select("id")
        .eq("gmail_thread_id", email.threadId)
        .single();

      if (existing) continue;

      await runSupportPipeline({
        channel: "email",
        message: email.body,
        contactEmail: email.fromEmail,
        contactName: email.from.replace(/<.+>/, "").trim(),
        subject: email.subject,
        gmailThreadId: email.threadId,
        gmailMessageId: msg.id,
      });

      processed++;
    }

    return NextResponse.json({ processed });
  } catch (err) {
    console.error("Gmail poll error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
