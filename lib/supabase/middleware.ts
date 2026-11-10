/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Auth-only session handling for /dashboard/* and /admin/* (no database calls).
 *
 * Uses getClaims(): when the project signs JWTs with asymmetric keys the token is verified locally
 * against the cached JWKS (no network round trip); with the legacy shared secret it falls back to an
 * Auth-server check, same as getUser() did. It also refreshes an expired access token and writes the new
 * cookies. Pages and API routes still call getUser() for authoritative checks before touching user data.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as { sub?: string; email?: string } | undefined;
  const user = claims?.sub ? { email: claims.email } : null;

  const pathname = request.nextUrl.pathname;

  // Protect /dashboard/* routes
  if (pathname.startsWith("/dashboard")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  // Protect /admin/* routes — require admin email
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    const adminEmails = (process.env.ADMIN_EMAIL || "").split(",").map(e => e.trim());
    if (!adminEmails.length || !adminEmails.includes(user.email || "")) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
