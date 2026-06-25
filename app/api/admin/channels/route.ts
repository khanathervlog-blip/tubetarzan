import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";
import type { StoredChannelData } from "@/app/api/auth/youtube/callback/route";

function isAdmin(email: string) {
  return (process.env.ADMIN_EMAIL || "").split(",").map(e => e.trim()).includes(email);
}

async function getAdminUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !isAdmin(user.email)) return null;
  return user;
}

// GET /api/admin/channels — list all connected channels
export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const svc = await createServiceClient();
  const { data: profileRaw } = await svc
    .from("profiles")
    .select("locked_channel_id, allowed_channel_ids, allowed_channel_data")
    .eq("id", user.id)
    .single();

  const profile = profileRaw as Pick<Profile, "locked_channel_id" | "allowed_channel_ids" | "allowed_channel_data"> | null;

  const channels = (profile?.allowed_channel_data as StoredChannelData[] | null) || [];
  const activeId = profile?.locked_channel_id;

  return NextResponse.json({ channels, activeId });
}

// POST /api/admin/channels — switch active channel
export async function POST(request: NextRequest) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { channelId } = await request.json() as { channelId: string };
  if (!channelId) return NextResponse.json({ error: "channelId required" }, { status: 400 });

  const svc = await createServiceClient();
  const { data: profileRaw } = await svc
    .from("profiles")
    .select("allowed_channel_data")
    .eq("id", user.id)
    .single();

  const channels = ((profileRaw as { allowed_channel_data?: unknown })?.allowed_channel_data as StoredChannelData[] | null) || [];
  const ch = channels.find(c => c.id === channelId);
  if (!ch) return NextResponse.json({ error: "Channel not found" }, { status: 404 });

  await svc.from("profiles").update({
    locked_channel_id: ch.id,
    locked_channel_handle: ch.handle,
    locked_channel_name: ch.name,
    locked_channel_thumbnail: ch.thumbnail,
    locked_channel_subscriber_count: ch.subscriber_count,
    youtube_access_token: ch.access_token,
    youtube_refresh_token: ch.refresh_token,
    youtube_token_expires_at: ch.token_expires_at,
  } as Partial<Profile>).eq("id", user.id);

  return NextResponse.json({ ok: true, activeId: channelId });
}

// DELETE /api/admin/channels — remove a channel
export async function DELETE(request: NextRequest) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { channelId } = await request.json() as { channelId: string };
  if (!channelId) return NextResponse.json({ error: "channelId required" }, { status: 400 });

  const svc = await createServiceClient();
  const { data: profileRaw } = await svc
    .from("profiles")
    .select("locked_channel_id, allowed_channel_ids, allowed_channel_data")
    .eq("id", user.id)
    .single();

  const profile = profileRaw as Pick<Profile, "locked_channel_id" | "allowed_channel_ids" | "allowed_channel_data"> | null;
  const channels = (profile?.allowed_channel_data as StoredChannelData[] | null) || [];
  const ids = profile?.allowed_channel_ids || [];

  const updatedChannels = channels.filter(c => c.id !== channelId);
  const updatedIds = ids.filter(id => id !== channelId);

  const update: Partial<Profile> = {
    allowed_channel_data: updatedChannels,
    allowed_channel_ids: updatedIds,
  };

  // If deleting the active channel, switch to first remaining or clear
  if (profile?.locked_channel_id === channelId) {
    const next = updatedChannels[0] || null;
    if (next) {
      update.locked_channel_id = next.id;
      update.locked_channel_handle = next.handle;
      update.locked_channel_name = next.name;
      update.locked_channel_thumbnail = next.thumbnail;
      update.locked_channel_subscriber_count = next.subscriber_count;
      update.youtube_access_token = next.access_token;
      update.youtube_refresh_token = next.refresh_token;
      update.youtube_token_expires_at = next.token_expires_at;
    } else {
      update.locked_channel_id = null;
      update.locked_channel_handle = null;
      update.locked_channel_name = null;
      update.locked_channel_thumbnail = null;
      update.locked_channel_subscriber_count = null;
      update.youtube_access_token = null;
      update.youtube_refresh_token = null;
      update.youtube_token_expires_at = null;
    }
  }

  await svc.from("profiles").update(update).eq("id", user.id);

  return NextResponse.json({ ok: true });
}
