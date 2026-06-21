import { NextRequest, NextResponse } from "next/server";
import { getEmailContent, getNewMessageIds } from "@/lib/support-gmail";
import { runSupportPipeline } from "@/lib/support-pipeline";

// Gmail Pub/Sub push webhook — fires when new email arrives
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.message?.data) {
      return NextResponse.json({ ok: true });
    }

    // Gmail sends: { emailAddress, historyId } — NOT messageId
    const decoded = JSON.parse(
      Buffer.from(body.message.data, "base64").toString()
    );

    const historyId = decoded.historyId || decoded.message?.historyId;
    if (!historyId) return NextResponse.json({ ok: true });

    // Get actual message IDs from Gmail history
    const messageIds = await getNewMessageIds(String(historyId));
    if (messageIds.length === 0) return NextResponse.json({ ok: true });

    // Process each new message
    for (const messageId of messageIds) {
      const email = await getEmailContent(messageId);
      if (!email) continue;

      // Prevent reply loops
      if (
        email.fromEmail.includes("tubetarzan.com") ||
        email.fromEmail.includes("noreply@") ||
        email.fromEmail.includes("no-reply@") ||
        email.fromEmail.includes("mailer-daemon") ||
        email.fromEmail.includes("postmaster@")
      ) {
        continue;
      }

      // Skip empty or auto-reply messages
      if (!email.body || email.body.trim().length < 5) continue;

      await runSupportPipeline({
        channel: "email",
        message: email.body,
        contactEmail: email.fromEmail,
        contactName: email.from.replace(/<.+>/, "").trim(),
        subject: email.subject,
        gmailThreadId: email.threadId,
        gmailMessageId: messageId,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Inbound email error:", error);
    return NextResponse.json({ ok: true }); // always 200 or Pub/Sub retries forever
  }
}
