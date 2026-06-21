import { NextRequest, NextResponse } from "next/server";
import { getEmailContent } from "@/lib/support-gmail";
import { runSupportPipeline } from "@/lib/support-pipeline";

// Gmail Pub/Sub push webhook — fires when new email arrives at support@tubetarzan.com
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.message?.data) {
      return NextResponse.json({ ok: true }); // always 200 to Pub/Sub
    }

    const decoded = JSON.parse(
      Buffer.from(body.message.data, "base64").toString()
    );

    const messageId = decoded.messageId || decoded.message?.messageId;
    const emailAddress = decoded.emailAddress || decoded.message?.emailAddress || "";

    if (!messageId) return NextResponse.json({ ok: true });

    // Only process emails to support@tubetarzan.com
    if (emailAddress && !emailAddress.includes("support@tubetarzan.com")) {
      return NextResponse.json({ ok: true });
    }

    const email = await getEmailContent(messageId);
    if (!email) return NextResponse.json({ ok: true });

    // Prevent reply loops
    if (
      email.fromEmail.includes("tubetarzan.com") ||
      email.fromEmail.includes("noreply@") ||
      email.fromEmail.includes("no-reply@")
    ) {
      return NextResponse.json({ ok: true });
    }

    // Skip auto-replies and out-of-office
    if (!email.body || email.body.trim().length < 5) {
      return NextResponse.json({ ok: true });
    }

    await runSupportPipeline({
      channel: "email",
      message: email.body,
      contactEmail: email.fromEmail,
      contactName: email.from.replace(/<.+>/, "").trim(),
      subject: email.subject,
      gmailThreadId: email.threadId,
      gmailMessageId: messageId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Inbound email error:", error);
    return NextResponse.json({ ok: true }); // always 200 or Pub/Sub retries
  }
}
