import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ChannelPage from "@/components/dashboard/ChannelPage";
import type { Profile } from "@/types/database";

export default async function MyChannelPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isAdmin = (process.env.ADMIN_EMAIL || "").split(",").map(e => e.trim()).includes(user.email || "");

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("subscription_plan, locked_channel_id, locked_channel_name, locked_channel_handle, locked_channel_thumbnail, locked_channel_subscriber_count, channel_lock_until")
    .eq("id", user.id)
    .single();

  const profile = profileRaw as Pick<
    Profile,
    | "subscription_plan"
    | "locked_channel_id"
    | "locked_channel_name"
    | "locked_channel_handle"
    | "locked_channel_thumbnail"
    | "locked_channel_subscriber_count"
    | "channel_lock_until"
  > | null;

  return <ChannelPage profile={profile} isAdmin={isAdmin} />;
}
