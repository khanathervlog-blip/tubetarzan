/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";

// React's cache() is scoped to a single server render. A dashboard page and its layout both ask Supabase
// "who is this user?" - with this holder the second call reuses the first call's answer instead of making
// another round trip to the Supabase Auth server. It is never shared between requests or between users.
// (Outside a render, e.g. in route handlers, cache() simply doesn't dedupe, which is harmless.)
const getRequestAuthHolder = cache(() => ({
  pending: null as ReturnType<ReturnType<typeof createServerClient>["auth"]["getUser"]> | null,
}));

export async function createClient() {
  const cookieStore = await cookies();

  const client = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server component — can't set cookies
          }
        },
      },
    }
  );

  const holder = getRequestAuthHolder();
  const originalGetUser = client.auth.getUser.bind(client.auth);
  client.auth.getUser = ((jwt?: string) => {
    if (jwt) return originalGetUser(jwt); // explicit token: never reuse
    if (!holder.pending) holder.pending = originalGetUser();
    return holder.pending;
  }) as typeof client.auth.getUser;

  return client;
}

export async function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
