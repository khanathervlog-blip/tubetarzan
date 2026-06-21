/* eslint-disable @typescript-eslint/no-explicit-any */
import { searchKnowledgeBase, calculateConfidence, buildKnowledgeContext } from "./support-rag";
import { generateSupportReply } from "./openai-support";
import { sendGmailReply, createGmailDraft } from "./support-gmail";
import { createServiceClient } from "./supabase/server";
import { Resend } from "resend";

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
  const { data: settingRow } = await supabase
    .from("support_settings")
    .select("value")
    .eq("key", "confidence_threshold")
    .single();
  const threshold = parseInt((settingRow as any)?.value || "80");

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
    const { data } = await supabase
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
    conversation = data;
    conversationId = data?.id;
  }

  // Step 2: Build conversation history for GPT
  const existingMessages: any[] = conversation?.messages || [];
  const conversationHistory: any[] = existingMessages.map((m: any) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  // Step 3: RAG search
  const knowledgeChunks = await searchKnowledgeBase(input.message, 5, 0.70);
  const knowledgeContext = buildKnowledgeContext(knowledgeChunks);

  // Step 4: Generate reply
  const { reply, needsEscalation } = await generateSupportReply(
    input.message,
    conversationHistory,
    knowledgeContext
  );

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

  if (input.channel === "email" && input.gmailThreadId) {
    if (shouldAutoReply) {
      const sent = await sendGmailReply(
        input.gmailThreadId,
        input.contactEmail!,
        input.subject || "Support",
        reply
      );
      if (sent) {
        status = "auto_resolved";
        autoReplied = true;
      }
    } else {
      await createGmailDraft(
        input.gmailThreadId,
        input.contactEmail!,
        input.subject || "Support",
        reply.replace("ESCALATE: ", "")
      );
      status = "needs_review";
      autoReplied = false;
      await notifyAdmin(input, reply, confidence, threshold);
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
      subject: `⚠️ Support needs review — ${input.subject || "Chat query"}`,
      html: `
        <h2>Support query needs your review</h2>
        <p><strong>Channel:</strong> ${input.channel}</p>
        <p><strong>From:</strong> ${input.contactEmail || "Chat visitor"}</p>
        <p><strong>Confidence:</strong> ${confidence}% (below ${threshold}% threshold)</p>
        <hr/>
        <h3>Customer message:</h3>
        <p>${input.message}</p>
        <hr/>
        <h3>AI draft reply:</h3>
        <p>${draftReply.replace("ESCALATE: ", "")}</p>
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
