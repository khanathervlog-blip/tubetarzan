import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setupLemonSqueezy } from "@/lib/lemonsqueezy";
import { getCustomer } from "@lemonsqueezy/lemonsqueezy.js";
import type { Profile } from "@/types/database";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profileRaw } = await supabase
      .from("profiles")
      .select("lemonsqueezy_customer_id")
      .eq("id", user.id)
      .single();
    const profile = profileRaw as Pick<Profile, "lemonsqueezy_customer_id"> | null;

    if (!profile?.lemonsqueezy_customer_id) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    setupLemonSqueezy();

    const customer = await getCustomer(profile.lemonsqueezy_customer_id);

    if (!customer.data) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const portalUrl =
      customer.data.data.attributes.urls?.customer_portal || null;

    if (!portalUrl) {
      return NextResponse.json(
        { error: "Portal URL not available" },
        { status: 500 }
      );
    }

    return NextResponse.json({ portalUrl });
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
