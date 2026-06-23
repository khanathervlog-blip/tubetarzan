import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

function verifyCron(request: Request): boolean {
  const vercelCron = request.headers.get("x-vercel-cron");
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  return !!(vercelCron || (secret && auth === `Bearer ${secret}`));
}

const PLAN_PRICE: Record<string, number> = { creator: 9, pro: 25, agency: 99 };

export async function GET(request: Request) {
  if (!verifyCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = await createServiceClient();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [newUsersRes, activeRes, securityRes, scansRes] = await Promise.allSettled([
    svc.from("profiles").select("id, subscription_plan").gte("created_at", weekAgo),
    svc.from("profiles").select("id", { count: "exact", head: true }).gt("scans_today", 0),
    svc.from("security_events").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    svc.from("profiles").select("scans_today").gt("scans_today", 0),
  ]);

  const newUsers = newUsersRes.status === "fulfilled" ? (newUsersRes.value.data || []) : [];
  const activeCount = activeRes.status === "fulfilled" ? (activeRes.value.count || 0) : 0;
  const securityCount = securityRes.status === "fulfilled" ? (securityRes.value.count || 0) : 0;
  const scansData = scansRes.status === "fulfilled" ? (scansRes.value.data || []) : [];

  const totalScans = (scansData as { scans_today: number }[]).reduce((sum, p) => sum + (p.scans_today || 0), 0);
  const paidNew = (newUsers as { subscription_plan: string }[]).filter((u) =>
    ["creator", "pro", "agency"].includes(u.subscription_plan)
  );
  const newMrr = paidNew.reduce((sum, u) => sum + (PLAN_PRICE[u.subscription_plan] || 0), 0);

  const adminEmail = process.env.ADMIN_EMAIL?.split(",")[0]?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tubetarzan.com";

  if (adminEmail && process.env.RESEND_API_KEY) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "TubeTarzan Reports <reports@tubetarzan.com>",
          to: adminEmail,
          subject: `TubeTarzan Weekly — ${now.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
              <h2 style="color:#FFD200">Weekly Summary</h2>
              <table style="width:100%;border-collapse:collapse">
                <tr><td style="padding:8px 0;color:#666">New users this week</td><td style="padding:8px 0;font-weight:bold">${newUsers.length} (${paidNew.length} paid)</td></tr>
                <tr><td style="padding:8px 0;color:#666">New MRR added</td><td style="padding:8px 0;font-weight:bold;color:#22C55E">+$${newMrr}/mo</td></tr>
                <tr><td style="padding:8px 0;color:#666">Active users today</td><td style="padding:8px 0;font-weight:bold">${activeCount}</td></tr>
                <tr><td style="padding:8px 0;color:#666">Total scans today</td><td style="padding:8px 0;font-weight:bold">${totalScans.toLocaleString()}</td></tr>
                <tr><td style="padding:8px 0;color:#666">Security events</td><td style="padding:8px 0;font-weight:bold;color:${securityCount > 0 ? "#FF3B3B" : "#22C55E"}">${securityCount}</td></tr>
              </table>
              <p style="margin-top:24px"><a href="${appUrl}/admin" style="background:#FFD200;color:#080808;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold">View Admin Panel →</a></p>
            </div>
          `,
        }),
      });
    } catch { /* email failure should not block the cron response */ }
  }

  return NextResponse.json({
    sent_to: adminEmail || "no admin email configured",
    metrics: { newUsers: newUsers.length, paidNew: paidNew.length, newMrr, activeCount, totalScans, securityCount },
  });
}
