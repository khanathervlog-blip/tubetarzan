import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runSupportPipeline } from "@/lib/support-pipeline";

export async function POST(req: NextRequest) {
  try {
    const { message, conversationId, visitorId, pageUrl } = await req.json();

    if (!message || message.trim().length < 2) {
      return NextResponse.json({ error: "Message too short" }, { status: 400 });
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
