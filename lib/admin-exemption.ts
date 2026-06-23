import { createServiceClient } from "./supabase/server";

export function isAdminEmail(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAIL || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  return adminEmails.includes(email);
}

export async function isExemptFromAllChecks(userId: string): Promise<boolean> {
  try {
    const svc = await createServiceClient();
    const { data: profile } = await svc
      .from("profiles")
      .select("email, is_test_account")
      .eq("id", userId)
      .single();

    if (!profile) return false;
    if (isAdminEmail(profile.email || "")) return true;
    if (profile.is_test_account === true) return true;
    return false;
  } catch {
    return false;
  }
}

export async function requireAdminUser(): Promise<{ email: string } | null> {
  const { createClient } = await import("./supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  if (!isAdminEmail(user.email)) return null;
  return { email: user.email };
}
