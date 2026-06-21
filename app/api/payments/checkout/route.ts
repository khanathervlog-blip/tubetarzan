import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setupLemonSqueezy, PLAN_VARIANT_MAP, createCheckout } from "@/lib/lemonsqueezy";
import type { Profile } from "@/types/database";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { plan, period = "monthly" } = body as {
      plan: string;
      period?: "monthly" | "annual";
    };

    const variantKey = `${plan}_${period}`;
    const variantId = PLAN_VARIANT_MAP[variantKey];

    if (!variantId) {
      return NextResponse.json(
        { error: `Invalid plan or period: ${variantKey}` },
        { status: 400 }
      );
    }

    setupLemonSqueezy();

    const { data: profileRaw } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();
    const profile = profileRaw as Pick<Profile, "full_name" | "email"> | null;

    const checkout = await createCheckout(
      process.env.LEMONSQUEEZY_STORE_ID!,
      variantId,
      {
        checkoutOptions: {
          embed: false,
          media: true,
          logo: true,
        },
        checkoutData: {
          email: profile?.email || user.email || "",
          name: profile?.full_name || "",
          custom: {
            user_id: user.id,
          },
        },
        expiresAt: null,
        preview: false,
        testMode: process.env.NODE_ENV !== "production",
      }
    );

    if (!checkout.data) {
      return NextResponse.json(
        { error: "Failed to create checkout" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      checkoutUrl: checkout.data.data.attributes.url,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
