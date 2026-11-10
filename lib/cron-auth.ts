/**
 * Verifies that a request really comes from Vercel Cron.
 *
 * When CRON_SECRET is set (Vercel then sends `Authorization: Bearer <CRON_SECRET>` on every cron call)
 * the bearer token is REQUIRED. The `x-vercel-cron` header alone is not trusted because anyone can add it
 * to a request, which let bots trigger the cron jobs (and their database / third-party API calls) at will.
 *
 * If CRON_SECRET is not configured we fall back to the old header check so existing deployments keep working,
 * but set CRON_SECRET in the Vercel project settings to close that hole.
 */
export function verifyCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    return request.headers.get("authorization") === `Bearer ${secret}`;
  }
  return !!request.headers.get("x-vercel-cron");
}
