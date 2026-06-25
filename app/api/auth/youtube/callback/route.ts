import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export interface StoredChannelData {
  id: string;
  name: string;
  handle: string | null;
  thumbnail: string | null;
  subscriber_count: number | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string;
  connected_at: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // Decode state — supports both old plain-string format and new JSON format
  const stateParam = searchParams.get("state");
  let returnTo = "onboarding";
  let addChannel = false;
  try {
    if (stateParam) {
      const decoded = Buffer.from(stateParam, "base64").toString();
      try {
        const parsed = JSON.parse(decoded);
        returnTo = parsed.returnTo || "onboarding";
        addChannel = parsed.addChannel === true;
      } catch {
        returnTo = decoded; // legacy plain-string state
      }
    }
  } catch { /* ignore */ }

  const failRedirect = returnTo === "dashboard"
    ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/channel?error=oauth_failed`
    : `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?error=oauth_failed`;

  if (error || !code) {
    return NextResponse.redirect(failRedirect);
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`);
    }

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json() as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error?: string;
    };

    if (tokens.error || !tokens.access_token) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?error=token_exchange_failed`
      );
    }

    // Get channel info
    const channelRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );
    const channelData = await channelRes.json() as {
      items?: Array<{
        id: string;
        snippet: {
          title: string;
          customUrl?: string;
          thumbnails?: { default?: { url: string } };
        };
        statistics?: { subscriberCount?: string };
      }>;
    };

    const channel = channelData.items?.[0];
    if (!channel) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?error=no_channel`
      );
    }

    const tokenExpiry = new Date(
      Date.now() + (tokens.expires_in || 3600) * 1000
    ).toISOString();

    const serviceSupabase = await createServiceClient();

    if (addChannel) {
      // ADD mode — append to allowed_channel_data without replacing locked channel
      const { data: profileRaw } = await serviceSupabase
        .from("profiles")
        .select("allowed_channel_ids, allowed_channel_data")
        .eq("id", user.id)
        .single();

      const profile = profileRaw as Pick<Profile, "allowed_channel_ids" | "allowed_channel_data"> | null;
      const existingIds: string[] = profile?.allowed_channel_ids || [];
      const existingData: StoredChannelData[] = (profile?.allowed_channel_data as StoredChannelData[]) || [];

      // Upsert — update entry if channel already exists, else append
      const newEntry: StoredChannelData = {
        id: channel.id,
        name: channel.snippet.title,
        handle: channel.snippet.customUrl || null,
        thumbnail: channel.snippet.thumbnails?.default?.url || null,
        subscriber_count: channel.statistics?.subscriberCount
          ? parseInt(channel.statistics.subscriberCount) : null,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        token_expires_at: tokenExpiry,
        connected_at: new Date().toISOString(),
      };

      const filteredData = existingData.filter(c => c.id !== channel.id);
      const filteredIds = existingIds.filter(id => id !== channel.id);

      await serviceSupabase.from("profiles").update({
        allowed_channel_ids: [...filteredIds, channel.id],
        allowed_channel_data: [...filteredData, newEntry],
      } as Partial<Profile>).eq("id", user.id);

      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/channel?channel_added=true`
      );
    }

    // DEFAULT mode — replace locked channel (original behaviour)
    // Also store in allowed_channel_data so it shows in the multi-channel manager
    const { data: profileRaw } = await serviceSupabase
      .from("profiles")
      .select("allowed_channel_ids, allowed_channel_data")
      .eq("id", user.id)
      .single();

    const profile = profileRaw as Pick<Profile, "allowed_channel_ids" | "allowed_channel_data"> | null;
    const existingData: StoredChannelData[] = (profile?.allowed_channel_data as StoredChannelData[]) || [];
    const existingIds: string[] = profile?.allowed_channel_ids || [];

    const newEntry: StoredChannelData = {
      id: channel.id,
      name: channel.snippet.title,
      handle: channel.snippet.customUrl || null,
      thumbnail: channel.snippet.thumbnails?.default?.url || null,
      subscriber_count: channel.statistics?.subscriberCount
        ? parseInt(channel.statistics.subscriberCount) : null,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      token_expires_at: tokenExpiry,
      connected_at: new Date().toISOString(),
    };

    const filteredData = existingData.filter(c => c.id !== channel.id);
    const filteredIds = existingIds.filter(id => id !== channel.id);

    await serviceSupabase.from("profiles").update({
      locked_channel_id: channel.id,
      locked_channel_handle: channel.snippet.customUrl || null,
      locked_channel_name: channel.snippet.title,
      locked_channel_thumbnail: channel.snippet.thumbnails?.default?.url || null,
      locked_channel_subscriber_count: channel.statistics?.subscriberCount
        ? parseInt(channel.statistics.subscriberCount) : null,
      channel_connected_at: new Date().toISOString(),
      channel_lock_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      youtube_access_token: tokens.access_token,
      youtube_refresh_token: tokens.refresh_token || null,
      youtube_token_expires_at: tokenExpiry,
      allowed_channel_ids: [...filteredIds, channel.id],
      allowed_channel_data: [...filteredData, newEntry],
    } as Partial<Profile>).eq("id", user.id);

    if (returnTo === "dashboard") {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/channel?channel_connected=true`
      );
    }
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?step=3&channel_connected=true`
    );
  } catch (err) {
    console.error("YouTube OAuth callback error:", err);
    return NextResponse.redirect(failRedirect);
  }
}
