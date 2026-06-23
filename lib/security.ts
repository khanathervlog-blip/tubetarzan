import { createServiceClient } from "./supabase/server";
import { isExemptFromAllChecks } from "./admin-exemption";

export async function checkIfSuspended(
  userId: string
): Promise<{ suspended: boolean; reason?: string }> {
  if (await isExemptFromAllChecks(userId)) return { suspended: false };

  try {
    const svc = await createServiceClient();
    const { data: profile } = await svc
      .from("profiles")
      .select("is_suspended, suspension_reason")
      .eq("id", userId)
      .single();

    if (profile?.is_suspended) {
      return {
        suspended: true,
        reason: profile.suspension_reason || "Account suspended",
      };
    }
  } catch {
    // Non-fatal: allow on error
  }
  return { suspended: false };
}

export async function createSecurityEvent(
  userId: string,
  eventType: string,
  severity: "low" | "medium" | "high" | "critical",
  details: object,
  ipAddress?: string
): Promise<void> {
  try {
    const svc = await createServiceClient();
    await svc.from("security_events").insert({
      user_id: userId,
      event_type: eventType,
      severity,
      details,
      ip_address: ipAddress || null,
    });

    const riskIncrement = { low: 5, medium: 15, high: 30, critical: 50 }[severity] || 5;

    const { data: profile } = await svc
      .from("profiles")
      .select("security_risk_score")
      .eq("id", userId)
      .single();

    const newScore = (profile?.security_risk_score || 0) + riskIncrement;

    await svc
      .from("profiles")
      .update({ security_risk_score: newScore })
      .eq("id", userId);

    // Auto-suspend at score >= 100
    if (newScore >= 100) {
      await svc
        .from("profiles")
        .update({
          is_suspended: true,
          suspension_reason: "Auto-suspended: security risk score reached 100",
          suspended_at: new Date().toISOString(),
        })
        .eq("id", userId);
    }
  } catch {
    // Non-fatal
  }
}

export async function trackUserIP(
  userId: string,
  request: Request
): Promise<void> {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "";

    const svc = await createServiceClient();
    await svc.from("user_ip_log").insert({
      user_id: userId,
      ip_address: ip,
      user_agent: userAgent,
      device_type: /mobile/i.test(userAgent) ? "mobile" : "desktop",
    });

    if (ip !== "unknown") {
      await checkAccountSharing(userId, ip);
    }
  } catch {
    // Non-fatal
  }
}

export async function checkAccountSharing(
  userId: string,
  ip: string
): Promise<boolean> {
  if (!ip || ip === "unknown") return false;

  try {
    const svc = await createServiceClient();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: ipLogs } = await svc
      .from("user_ip_log")
      .select("user_id")
      .eq("ip_address", ip)
      .gte("created_at", since);

    if (!ipLogs) return false;
    const uniqueUsers = new Set(ipLogs.map((l: { user_id: string }) => l.user_id));
    uniqueUsers.delete(userId);

    if (uniqueUsers.size >= 3) {
      await createSecurityEvent(
        userId,
        "account_sharing",
        "high",
        { ip, other_user_count: uniqueUsers.size },
        ip
      );
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function checkRateLimit(
  userId: string,
  endpoint: string,
  limitPerMinute: number
): Promise<{ allowed: boolean; remaining: number }> {
  if (await isExemptFromAllChecks(userId))
    return { allowed: true, remaining: limitPerMinute };

  try {
    const svc = await createServiceClient();
    const since = new Date(Date.now() - 60 * 1000).toISOString();
    const { count } = await svc
      .from("rate_limit_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("endpoint", endpoint)
      .gte("created_at", since);

    const requests = count || 0;
    const allowed = requests < limitPerMinute;

    await svc.from("rate_limit_log").insert({
      user_id: userId,
      endpoint,
      requests_this_minute: requests + 1,
      was_blocked: !allowed,
    });

    return { allowed, remaining: Math.max(0, limitPerMinute - requests - 1) };
  } catch {
    return { allowed: true, remaining: limitPerMinute };
  }
}

export function detectBot(userAgent: string): boolean {
  return /bot|crawler|spider|scraper|headless|phantom|selenium|puppeteer/i.test(
    userAgent
  );
}
