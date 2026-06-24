import { createServiceClient } from "./supabase/server";

const ADMIN_EMAILS = (process.env.ADMIN_EMAIL || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

// Only send outbound email to verified TubeTarzan users or admins.
// Prevents the support pipeline from auto-replying to promotional/spam email
// that lands in the support inbox via Gmail Pub/Sub.
export async function isVerifiedRecipient(email: string): Promise<boolean> {
  if (!email) return false;
  if (isAdminEmail(email)) return true;
  const svc = await createServiceClient();
  const { data } = await svc
    .from("profiles")
    .select("id")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  return !!data;
}
