import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CAPTION_LANGUAGE_LIMIT, type PlanId } from "@/lib/plans";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: p } = await supabase.from("profiles").select("subscription_plan, email").eq("id", user.id).single();
  const profile = p as { subscription_plan: PlanId; email: string } | null;
  const isAdmin = (process.env.ADMIN_EMAIL || "").split(",").map((e) => e.trim()).includes(profile?.email || user.email || "");
  const plan = (profile?.subscription_plan || "free") as PlanId;
  return NextResponse.json({ plan, isAdmin, maxLanguages: isAdmin ? 20 : CAPTION_LANGUAGE_LIMIT[plan] ?? 0, canUploadToYouTube: isAdmin });
}
