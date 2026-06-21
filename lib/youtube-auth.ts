import { createServiceClient } from "./supabase/server";
import type { Profile } from "@/types/database";

export async function getValidAccessToken(userId: string): Promise<string> {
  const supabase = await createServiceClient();
  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("youtube_access_token, youtube_refresh_token, youtube_token_expires_at")
    .eq("id", userId)
    .single();

  const profile = profileRaw as Pick<
    Profile,
    "youtube_access_token" | "youtube_refresh_token" | "youtube_token_expires_at"
  > | null;

  if (!profile?.youtube_access_token) {
    throw new Error("No YouTube access token found. Please reconnect your channel.");
  }

  const expiresAt = new Date(profile.youtube_token_expires_at || 0);
  const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000);

  if (expiresAt > fiveMinFromNow) {
    return profile.youtube_access_token;
  }

  if (!profile.youtube_refresh_token) {
    throw new Error("No refresh token. Please reconnect your YouTube channel.");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: profile.youtube_refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const tokens = await res.json() as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };

  if (tokens.error || !tokens.access_token) {
    throw new Error("Token refresh failed. Please reconnect your YouTube channel.");
  }

  await supabase.from("profiles").update({
    youtube_access_token: tokens.access_token,
    youtube_token_expires_at: new Date(
      Date.now() + (tokens.expires_in || 3600) * 1000
    ).toISOString(),
  } as Partial<Profile>).eq("id", userId);

  return tokens.access_token;
}
