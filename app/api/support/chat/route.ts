import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runSupportPipeline } from "@/lib/support-pipeline";
import { allowChatRequest } from "@/lib/support-cache";

export async function POST(req: NextRequest) {
  try {
    // Public endpoint: every message costs an embedding + an LLM call, so cap how fast one client can send.
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!allowChatRequest(ip)) {
      return NextResponse.json({ error: "Too many messages. Please wait a few minutes." }, { status: 429 });
    }

    const { message, conversationId, visitorId, pageUrl } = await req.json();

    if (!message || message.trim().length < 2) {
      return NextResponse.json({ error: "Message too short" }, { status: 400 });
    }
    if (message.length > 4000) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const result = await runSupportPipeline({
      channel: "chat",
      message: message.trim(),
      conversationId,
      userId: user?.id,
      contactEmail: user?.email,
    });

    // Track chat session
    if (visitorId) {
      const { createServiceClient } = await import("@/lib/supabase/server");
      const serviceClient = await createServiceClient();
      await serviceClient.from("support_chat_sessions").upsert({
        visitor_id: visitorId,
        user_id: user?.id || null,
        page_url: pageUrl || null,
        conversation_id: result.conversationId,
        last_activity: new Date().toISOString(),
      }, { onConflict: "visitor_id" });
    }

    return NextResponse.json({
      reply: result.reply,
      confidence: result.confidence,
      conversationId: result.conversationId,
    });
  } catch (error) {
    console.error("Chat route error:", error);
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 });
  }
}
