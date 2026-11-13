/* eslint-disable @typescript-eslint/no-explicit-any */
import { searchKnowledgeBase, calculateConfidence, buildKnowledgeContext } from "./support-rag";
import { generateSupportReply } from "./openai-support";
import { createServiceClient } from "./supabase/server";
import { isVerifiedRecipient } from "./email-guard";
import {
  getCachedAnswer,
  setCachedAnswer,
  getCachedThreshold,
  setCachedThreshold,
} from "./support-cache";
import { Resend } from "resend";
import { escapeHtml } from "./html-escape";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SupportPipelineInput {
  channel: "email" | "chat";
  message: string;
  conversationId?: string;
  contactEmail?: string;
  contactName?: string;
  subject?: string;
  gmailThreadId?: string;
  gmailMessageId?: string;
  userId?: string;
}

export interface SupportPipelineOutput {
  reply: string;
  confidence: number;
  autoReplied: boolean;
  conversationId: string;
  status: string;
}

export async function runSupportPipeline(
  input: SupportPipelineInput
): Promise<SupportPipelineOutput> {
  const supabase = await createServiceClient();

  // Get threshold from settings (default 80)
  // (cached for 5 minutes - it only changes when an admin edits the setting)
  let threshold = getCachedThreshold();
  if (threshold === null) {
    const { data: settingRow } = await supabase
      .from("support_settings")
      .select("value")
      .eq("key", "confidence_threshold")
      .single();
    threshold = parseInt((settingRow as any)?.value || "80");
    setCachedThreshold(threshold);
  }

  // Step 1: Get or create conversation
  let conversationId = input.conversationId;
  let conversation: any = null;

  if (input.gmailThreadId) {
    const { data } = await supabase
      .from("support_conversations")
      .select("*")
      .eq("gmail_thread_id", input.gmailThreadId)
      .single();
    conversation = data;
    if (data) conversationId = data.id;
  }

  if (conversationId && !conversation) {
    const { data } = await supabase
      .from("support_conversations")
      .select("*")
      .eq("id", conversationId)
      .single();
    conversation = data;
  }

  if (!conversation) {
    const { data, error: insertError } = await supabase
      .from("support_conversations")
      .insert({
        channel: input.channel,
        contact_email: input.contactEmail || null,
        contact_name: input.contactName || null,
        subject: input.subject || null,
        gmail_thread_id: input.gmailThreadId || null,
        gmail_message_id: input.gmailMessageId || null,
        user_id: input.userId || null,
        messages: [],
        status: "open",
      })
      .select()
      .single();
    if (insertError) {
      console.error("Failed to create conversation:", insertError.message, insertError.details);
      throw new Error(`DB insert failed: ${insertError.message}`);
    }
    conversation = data;
    conversationId = data?.id;
  }

  // Step 2: Build conversation history for GPT
  const existingMessages: any[] = conversation?.messages || [];
  // Only the most recent turns go to the model - older ones add tokens (and CPU) but little value
  const conversationHistory: any[] = existingMessages.slice(-12).map((m: any) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  // First chat message of a conversation: its answer depends only on the question + public knowledge base,
  // so identical questions can share one answer (see support-cache.ts for why this is private-data safe).
  const cacheable = input.channel === "chat" && existingMessages.length === 0;
  const cached = cacheable ? getCachedAnswer(input.message) : null;

  let knowledgeChunks: Awaited<ReturnType<typeof searchKnowledgeBase>>;
  let reply: string;
  let needsEscalation: boolean;

  if (cached) {
    knowledgeChunks = cached.chunks;
    reply = cached.reply;
    needsEscalation = cached.needsEscalation;
  } else {
    // Step 3: RAG search (pgvector inside Postgres - nothing to rebuild or load here)
    knowledgeChunks = await searchKnowledgeBase(input.message, 5, 0.40);
    const knowledgeContext = buildKnowledgeContext(knowledgeChunks);

    // Step 4: Generate reply
    const generated = await generateSupportReply(
      input.message,
      conversationHistory,
      knowledgeContext
    );
    reply = generated.reply;
    needsEscalation = generated.needsEscalation;
    if (cacheable) setCachedAnswer(input.message, { reply, needsEscalation, chunks: knowledgeChunks });
  }

  // Step 5: Confidence score
  const confidence = calculateConfidence(knowledgeChunks, needsEscalation);
  const shouldAutoReply = confidence >= threshold && !needsEscalation;

  // Step 6: Update messages array
  const updatedMessages = [
    ...existingMessages,
    { role: "user", content: input.message, timestamp: new Date().toISOString() },
    {
      role: "assistant",
      content: reply,
      timestamp: new Date().toISOString(),
      confidence,
      sent_as: shouldAutoReply ? "auto_reply" : "draft",
    },
  ];

  // Step 7: Auto-reply or draft
  let status = "open";
  let autoReplied = false;

  if (input.channel === "email" && input.contactEmail) {
    const subject = input.subject || "Support";
    const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;
    const cleanReply = reply.replace("ESCALATE: ", "").replace("ESCALATE:", "");

    // Only reply to verified TubeTarzan users or admins — prevents auto-replying
    // to promotional/spam email arriving via Gmail Pub/Sub.
    const verified = await isVerifiedRecipient(input.contactEmail);
    if (verified) {
      try {
        await resend.emails.send({
          from: "TubeTarzan Support <support@tubetarzan.com>",
          to: input.contactEmail,
          subject: replySubject,
          text: cleanReply + "\n\n--\nTubeTarzan Support\nsupport@tubetarzan.com",
        });
        autoReplied = true;
        status = shouldAutoReply ? "auto_resolved" : "needs_review";
      } catch (err) {
        console.error("Resend reply failed:", err);
        status = "needs_review";
      }
    } else {
      // Unknown sender — save draft for human review, do not auto-reply
      status = "needs_review";
      autoReplied = false;
    }

    // Notify admin when confidence is low or sender is unverified
    if (!shouldAutoReply || !verified) {
      await notifyAdmin(input, cleanReply, confidence, threshold);
    }
  } else if (input.channel === "chat") {
    status = shouldAutoReply ? "auto_resolved" : "needs_review";
    autoReplied = true;
  }

  // Step 8: Save to DB
  await supabase
    .from("support_conversations")
    .update({
      messages: updatedMessages,
      status,
      auto_replied: autoReplied,
      confidence_score: confidence,
      knowledge_chunks_used: knowledgeChunks.map((c) => ({
        id: c.id,
        title: c.title,
        similarity: c.similarity,
      })),
      draft_reply: !autoReplied ? reply.replace("ESCALATE: ", "") : null,
      updated_at: new Date().toISOString(),
      resolved_at: status === "auto_resolved" ? new Date().toISOString() : null,
      resolved_by: status === "auto_resolved" ? "ai" : null,
    })
    .eq("id", conversationId);

  return { reply, confidence, autoReplied, conversationId: conversationId!, status };
}

async function notifyAdmin(
  input: SupportPipelineInput,
  draftReply: string,
  confidence: number,
  threshold: number
): Promise<void> {
  const notifyEmail = process.env.ADMIN_EMAIL?.split(",")[0]?.trim();
  if (!notifyEmail) return;

  try {
    await resend.emails.send({
      from: "TubeTarzan Support <noreply@tubetarzan.com>",
      to: notifyEmail,
      subject: `⚠️ Support needs review — ${(input.subject || "Chat query").replace(/[\r\n]+/g, " ").slice(0, 120)}`,
      html: `
        <h2>Support query needs your review</h2>
        <p><strong>Channel:</strong> ${escapeHtml(input.channel)}</p>
        <p><strong>From:</strong> ${escapeHtml(input.contactEmail || "Chat visitor")}</p>
        <p><strong>Confidence:</strong> ${confidence}% (below ${threshold}% threshold)</p>
        <hr/>
        <h3>Customer message:</h3>
        <p style="white-space:pre-wrap">${escapeHtml(input.message)}</p>
        <hr/>
        <h3>AI draft reply:</h3>
        <p style="white-space:pre-wrap">${escapeHtml(draftReply.replace("ESCALATE: ", ""))}</p>
        <hr/>
        <a href="https://tubetarzan.com/admin/support" style="background:#FFD200;padding:12px 24px;text-decoration:none;color:#000;font-weight:bold;border-radius:6px;">
          Review in Admin Panel →
        </a>
      `,
    });
  } catch (err) {
    console.error("Admin notification failed:", err);
  }
}
