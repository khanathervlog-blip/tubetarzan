import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendGmailReply } from "@/lib/support-gmail";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminEmails = (process.env.ADMIN_EMAIL || "").split(",").map((e) => e.trim());
  if (!adminEmails.includes(user.email || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const serviceClient = await createServiceClient();

  if (body.send_draft) {
    const { data: conv } = await serviceClient
      .from("support_conversations")
      .select("*")
      .eq("id", params.id)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = conv as any;
    if (c?.gmail_thread_id && (body.custom_reply || c.draft_reply)) {
      await sendGmailReply(
        c.gmail_thread_id,
        c.contact_email,
        c.subject || "Support",
        body.custom_reply || c.draft_reply
      );
    }

    await serviceClient
      .from("support_conversations")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        resolved_by: "human",
        human_agent_notes: body.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id);

    return NextResponse.json({ success: true });
  }

  if (body.status) {
    await serviceClient
      .from("support_conversations")
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq("id", params.id);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "No action specified" }, { status: 400 });
}
