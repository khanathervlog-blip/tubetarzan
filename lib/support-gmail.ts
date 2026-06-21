import { google } from "googleapis";

function getGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

function buildRawEmail(
  to: string,
  subject: string,
  body: string,
  threadId?: string
): string {
  const lines = [
    `From: TubeTarzan Support <support@tubetarzan.com>`,
    `To: ${to}`,
    `Subject: ${subject.startsWith("Re:") ? subject : `Re: ${subject}`}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
    "",
    "--",
    "TubeTarzan Support",
    "support@tubetarzan.com",
  ];
  if (threadId) {
    lines.splice(2, 0, `In-Reply-To: ${threadId}`, `References: ${threadId}`);
  }
  return Buffer.from(lines.join("\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function sendGmailReply(
  threadId: string,
  toEmail: string,
  subject: string,
  replyBody: string
): Promise<boolean> {
  try {
    const gmail = getGmailClient();
    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: buildRawEmail(toEmail, subject, replyBody, threadId),
        threadId,
      },
    });
    return true;
  } catch (error) {
    console.error("Gmail send error:", error);
    return false;
  }
}

export async function createGmailDraft(
  threadId: string,
  toEmail: string,
  subject: string,
  draftBody: string
): Promise<string | null> {
  try {
    const gmail = getGmailClient();
    const draft = await gmail.users.drafts.create({
      userId: "me",
      requestBody: {
        message: {
          raw: buildRawEmail(toEmail, subject, draftBody, threadId),
          threadId,
        },
      },
    });
    return draft.data.id || null;
  } catch (error) {
    console.error("Gmail draft error:", error);
    return null;
  }
}

export async function getEmailContent(messageId: string): Promise<{
  from: string;
  fromEmail: string;
  subject: string;
  body: string;
  threadId: string;
} | null> {
  try {
    const gmail = getGmailClient();
    const message = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });

    const headers = message.data.payload?.headers || [];
    const from = headers.find((h) => h.name === "From")?.value || "";
    const subject = headers.find((h) => h.name === "Subject")?.value || "";
    const threadId = message.data.threadId || "";
    const fromEmail = from.match(/<(.+)>/)?.[1] || from;

    let body = "";
    const parts = message.data.payload?.parts || [];
    for (const part of parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        body = Buffer.from(part.body.data, "base64").toString("utf-8");
        break;
      }
    }
    if (!body && message.data.payload?.body?.data) {
      body = Buffer.from(message.data.payload.body.data, "base64").toString("utf-8");
    }

    // Strip quoted reply sections
    body = body.split("\nOn ")[0].split("\n>")[0].trim();

    return { from, fromEmail, subject, body, threadId };
  } catch (error) {
    console.error("Gmail fetch error:", error);
    return null;
  }
}

export async function getNewMessageIds(historyId: string): Promise<string[]> {
  try {
    const gmail = getGmailClient();
    const res = await gmail.users.history.list({
      userId: "me",
      startHistoryId: historyId,
      historyTypes: ["messageAdded"],
      labelId: "INBOX",
    });
    const history = res.data.history || [];
    const ids: string[] = [];
    for (const record of history) {
      for (const msg of record.messagesAdded || []) {
        if (msg.message?.id) ids.push(msg.message.id);
      }
    }
    return ids;
  } catch (error) {
    console.error("Gmail history error:", error);
    return [];
  }
}

export async function setupGmailWatch(): Promise<void> {
  const gmail = getGmailClient();
  await gmail.users.watch({
    userId: "me",
    requestBody: {
      topicName: process.env.GOOGLE_PUBSUB_TOPIC,
      labelIds: ["INBOX"],
      labelFilterAction: "include",
    },
  });
}
