import { createServiceClient } from "./supabase/server";
import type { Profile } from "@/types/database";

export async function verifyChannelOwnership(
  userId: string,
  channelId: string
): Promise<boolean> {
  const supabase = await createServiceClient();
  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("subscription_plan, locked_channel_id, allowed_channel_ids")
    .eq("id", userId)
    .single();

  const profile = profileRaw as Pick<
    Profile,
    "subscription_plan" | "locked_channel_id" | "allowed_channel_ids"
  > | null;

  if (!profile) return false;

  if (profile.subscription_plan !== "agency") {
    return profile.locked_channel_id === channelId;
  }

  return (profile.allowed_channel_ids || []).includes(channelId);
}
