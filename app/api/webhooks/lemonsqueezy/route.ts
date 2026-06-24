import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { VARIANT_PLAN_MAP } from "@/lib/lemonsqueezy";
import { Resend } from "resend";
import type { Profile, LemonsqueezyEvent } from "@/types/database";

function verifySignature(payload: string, signature: string): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET!;
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(hmac, "hex"),
    Buffer.from(signature, "hex")
  );
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature") || "";

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as {
    meta: { event_name: string; custom_data?: { user_id?: string } };
    data: {
      id: string;
      attributes: {
        status: string;
        variant_id: number;
        customer_id: number;
        renews_at?: string;
        ends_at?: string;
        trial_ends_at?: string;
        user_email?: string;
        user_name?: string;
      };
    };
  };

  const eventId = event.data.id;
  const eventName = event.meta.event_name;
  const supabase = await createServiceClient();

  // Idempotency check
  const { data: existing } = await supabase
    .from("lemonsqueezy_events")
    .select("id")
    .eq("id", eventId)
    .single();

  if (existing) {
    return NextResponse.json({ message: "Already processed" });
  }

  // Store event
  await supabase.from("lemonsqueezy_events").insert({
    id: eventId,
    event_name: eventName,
    data: event,
  } as LemonsqueezyEvent);

  const userId = event.meta.custom_data?.user_id;
  const attrs = event.data.attributes;
  const variantId = String(attrs.variant_id);
  const plan = VARIANT_PLAN_MAP[variantId] || "creator";

  switch (eventName) {
    case "subscription_created": {
      if (!userId) break;
      await supabase
        .from("profiles")
        .update({
          lemonsqueezy_customer_id: String(attrs.customer_id),
          lemonsqueezy_subscription_id: eventId,
          subscription_status: attrs.status === "on_trial" ? "trialing" : "active",
          subscription_plan: plan,
          subscription_period_end: attrs.ends_at || attrs.renews_at || null,
          subscription_renews_at: attrs.renews_at || null,
        } as Partial<Profile>)
        .eq("id", userId);

      // Send welcome email
      try {
        if (!attrs.user_email) break;
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "TubeTarzan <hello@tubetarzan.com>",
          to: attrs.user_email,
          subject: "Your TubeTarzan trial is live — 3 things to do today",
          html: `<p>Hi ${attrs.user_name || "there"},</p>
<p>Your ${plan} trial is active! Here's what to do first:</p>
<ol>
<li>Complete your onboarding setup</li>
<li>Run your first intelligence scan</li>
<li>Connect your YouTube channel</li>
</ol>
<p>Questions? Reply to this email.</p>
<p>— The TubeTarzan Team</p>`,
        });
      } catch (e) {
        console.error("Welcome email failed:", e);
      }
      break;
    }

    case "subscription_updated": {
      if (!userId) break;
      await supabase
        .from("profiles")
        .update({
          subscription_status:
            attrs.status === "on_trial"
              ? "trialing"
              : attrs.status === "active"
              ? "active"
              : attrs.status === "past_due"
              ? "past_due"
              : attrs.status === "cancelled"
              ? "canceled"
              : attrs.status === "paused"
              ? "paused"
              : "inactive",
          subscription_plan: plan,
          subscription_period_end: attrs.ends_at || attrs.renews_at || null,
          subscription_renews_at: attrs.renews_at || null,
        } as Partial<Profile>)
        .eq("id", userId);
      break;
    }

    case "subscription_cancelled": {
      if (!userId) break;
      await supabase
        .from("profiles")
        .update({
          subscription_status: "canceled",
          subscription_period_end: attrs.ends_at || null,
        } as Partial<Profile>)
        .eq("id", userId);

      // Send cancellation email
      try {
        if (!attrs.user_email) break;
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "TubeTarzan <hello@tubetarzan.com>",
          to: attrs.user_email,
          subject: "We're sorry to see you go",
          html: `<p>Your subscription has been cancelled. You'll keep access until ${attrs.ends_at}.</p>
<p>If there was something we could have done better, reply to this email — we read every message.</p>
<p>— The TubeTarzan Team</p>`,
        });
      } catch (e) {
        console.error("Cancellation email failed:", e);
      }
      break;
    }

    case "subscription_payment_failed": {
      if (!userId) break;
      await supabase
        .from("profiles")
        .update({ subscription_status: "past_due" } as Partial<Profile>)
        .eq("id", userId);

      try {
        if (!attrs.user_email) break;
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "TubeTarzan <hello@tubetarzan.com>",
          to: attrs.user_email,
          subject: "Action needed: your TubeTarzan payment failed",
          html: `<p>Your recent payment failed. Please update your payment method to keep access.</p>
<p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing">Update payment method →</a></p>`,
        });
      } catch (e) {
        console.error("Payment failed email error:", e);
      }
      break;
    }

    case "subscription_payment_success": {
      if (!userId) break;
      await supabase
        .from("profiles")
        .update({
          subscription_status: "active",
          subscription_period_end: attrs.renews_at || null,
          subscription_renews_at: attrs.renews_at || null,
        } as Partial<Profile>)
        .eq("id", userId);
      break;
    }

    case "subscription_expired": {
      if (!userId) break;
      await supabase
        .from("profiles")
        .update({
          subscription_status: "inactive",
          subscription_plan: "free",
        } as Partial<Profile>)
        .eq("id", userId);
      break;
    }
  }

  return NextResponse.json({ message: "Webhook processed" });
}
