import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

/**
 * Only the logged-in areas run through middleware, because that is where the session cookie has to be
 * refreshed (Server Components can't write cookies) and where the redirects live.
 *
 * Deliberately NOT matched:
 *  - public pages (/, /blog, /about, /pricing ... ) so they stay static / CDN-cached
 *  - /api/*  - every API route authenticates itself with supabase.auth.getUser() and can refresh cookies,
 *              so running middleware there only doubled the auth work (and made bots/webhooks/crons pay for it)
 *  - /_next/*, images, robots.txt, sitemap.xml, favicon
 *  - /login, /signup, /auth/* (the callback route sets its own session)
 */
export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
