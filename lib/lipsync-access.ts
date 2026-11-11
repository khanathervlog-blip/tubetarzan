import { isAdminEmail } from "./admin-exemption";
import { LIPSYNC_SECONDS_PER_MONTH } from "./plans";

/**
 * Who can SEE Lip Sync (menu entry, page). Admins always; paid plans that include Lip Sync minutes
 * (Creator, Pro, Agency). The exact rules - active subscription (not a free trial) and the monthly seconds
 * left - are checked on the server in lib/lipsync-server.ts before any GPU work starts.
 */
export function canUseLipSync(email: string | null | undefined, plan?: string | null): boolean {
  if (email && isAdminEmail(email)) return true;
  // Paid plans only once NEXT_PUBLIC_LIPSYNC_PAID=true (a commercially licensed engine is connected)
  if (process.env.NEXT_PUBLIC_LIPSYNC_PAID !== "true") return false;
  return (LIPSYNC_SECONDS_PER_MONTH[plan || "free"] ?? 0) > 0;
}
