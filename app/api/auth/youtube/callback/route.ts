import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // Decode state to determine where to redirect after success
  const stateParam = searchParams.get("state");
  let returnTo = "onboarding";
  try {
    if (stateParam) returnTo = Buffer.from(stateParam, "base64").toString();
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
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login`
      );
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
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
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
    await serviceSupabase.from("profiles").update({
      locked_channel_id: channel.id,
      locked_channel_handle: channel.snippet.customUrl || null,
      locked_channel_name: channel.snippet.title,
      locked_channel_thumbnail:
        channel.snippet.thumbnails?.default?.url || null,
      locked_channel_subscriber_count: channel.statistics?.subscriberCount
        ? parseInt(channel.statistics.subscriberCount)
        : null,
      channel_connected_at: new Date().toISOString(),
      channel_lock_until: new Date(
        Date.now() + 90 * 24 * 60 * 60 * 1000
      ).toISOString(),
      youtube_access_token: tokens.access_token,
      youtube_refresh_token: tokens.refresh_token || null,
      youtube_token_expires_at: tokenExpiry,
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
