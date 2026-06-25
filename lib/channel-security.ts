import { createServiceClient } from "./supabase/server";
import type { Profile } from "@/types/database";

export async function verifyChannelOwnership(
  userId: string,
  channelId: string
): Promise<boolean> {
  const supabase = await createServiceClient();
  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("subscription_plan, email, locked_channel_id, allowed_channel_ids")
    .eq("id", userId)
    .single();

  const profile = profileRaw as Pick<
    Profile,
    "subscription_plan" | "email" | "locked_channel_id" | "allowed_channel_ids"
  > | null;

  if (!profile) return false;

  // Admins and agency plan users can access any of their allowed channels
  const adminEmails = (process.env.ADMIN_EMAIL || "").split(",").map(e => e.trim());
  const isAdmin = profile.email && adminEmails.includes(profile.email);

  if (isAdmin || profile.subscription_plan === "agency") {
    return (profile.allowed_channel_ids || []).includes(channelId);
  }

  return profile.locked_channel_id === channelId;
}
