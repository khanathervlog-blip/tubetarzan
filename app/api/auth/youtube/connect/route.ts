import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  // "return=dashboard" → after connect, go back to /dashboard/channel
  // default → go to onboarding step 3
  const returnTo = searchParams.get("return") || "onboarding";
  // "addChannel=true" → append to allowed_channel_data instead of replacing locked_channel
  const addChannel = searchParams.get("addChannel") === "true";

  // SECURITY: random nonce, checked in the callback, so nobody can make a victim's account link
  // someone else's YouTube channel by sending them a crafted callback link (OAuth login CSRF).
  const nonce = crypto.randomUUID();
  const state = Buffer.from(JSON.stringify({ returnTo: returnTo === "dashboard" ? "dashboard" : "onboarding", addChannel, nonce })).toString("base64");

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/youtube.force-ssl",
    ].join(" "),
    access_type: "offline",
    // addChannel: show account picker so user can select a DIFFERENT Google account
    prompt: addChannel ? "select_account consent" : "consent",
    state,
  });

  const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  res.cookies.set("yt_oauth_nonce", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/youtube",
    maxAge: 600,
  });
  return res;
}
