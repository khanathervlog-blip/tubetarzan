/**
 * Approximate country from the browser's IANA time zone. Used by the free visitor tracker instead of IP
 * geolocation (which would need a server function per page view). Good enough for "where do my visitors
 * come from"; zones shared by several countries map to the most common one.
 */
const ZONES: Record<string, string> = {
  // South & Central Asia
  "Asia/Karachi": "PK", "Asia/Kolkata": "IN", "Asia/Calcutta": "IN", "Asia/Dhaka": "BD", "Asia/Kathmandu": "NP",
  "Asia/Colombo": "LK", "Asia/Kabul": "AF", "Asia/Tashkent": "UZ", "Asia/Almaty": "KZ", "Asia/Thimphu": "BT",
  "Indian/Maldives": "MV",
  // Middle East
  "Asia/Dubai": "AE", "Asia/Riyadh": "SA", "Asia/Qatar": "QA", "Asia/Kuwait": "KW", "Asia/Bahrain": "BH",
  "Asia/Muscat": "OM", "Asia/Tehran": "IR", "Asia/Baghdad": "IQ", "Asia/Amman": "JO", "Asia/Beirut": "LB",
  "Asia/Jerusalem": "IL", "Asia/Damascus": "SY", "Europe/Istanbul": "TR", "Asia/Baku": "AZ", "Asia/Tbilisi": "GE",
  "Asia/Yerevan": "AM",
  // East & South-East Asia, Oceania
  "Asia/Shanghai": "CN", "Asia/Hong_Kong": "HK", "Asia/Taipei": "TW", "Asia/Tokyo": "JP", "Asia/Seoul": "KR",
  "Asia/Singapore": "SG", "Asia/Kuala_Lumpur": "MY", "Asia/Jakarta": "ID", "Asia/Makassar": "ID", "Asia/Manila": "PH",
  "Asia/Bangkok": "TH", "Asia/Ho_Chi_Minh": "VN", "Asia/Saigon": "VN", "Asia/Yangon": "MM", "Asia/Phnom_Penh": "KH",
  "Australia/Sydney": "AU", "Australia/Melbourne": "AU", "Australia/Brisbane": "AU", "Australia/Perth": "AU",
  "Australia/Adelaide": "AU", "Pacific/Auckland": "NZ",
  // Europe
  "Europe/London": "GB", "Europe/Dublin": "IE", "Europe/Paris": "FR", "Europe/Berlin": "DE", "Europe/Madrid": "ES",
  "Europe/Rome": "IT", "Europe/Amsterdam": "NL", "Europe/Brussels": "BE", "Europe/Zurich": "CH", "Europe/Vienna": "AT",
  "Europe/Stockholm": "SE", "Europe/Oslo": "NO", "Europe/Copenhagen": "DK", "Europe/Helsinki": "FI",
  "Europe/Warsaw": "PL", "Europe/Prague": "CZ", "Europe/Budapest": "HU", "Europe/Bucharest": "RO",
  "Europe/Athens": "GR", "Europe/Lisbon": "PT", "Europe/Kiev": "UA", "Europe/Kyiv": "UA", "Europe/Moscow": "RU",
  "Europe/Belgrade": "RS", "Europe/Sofia": "BG", "Europe/Zagreb": "HR",
  // Africa
  "Africa/Cairo": "EG", "Africa/Lagos": "NG", "Africa/Nairobi": "KE", "Africa/Johannesburg": "ZA",
  "Africa/Casablanca": "MA", "Africa/Algiers": "DZ", "Africa/Tunis": "TN", "Africa/Accra": "GH",
  "Africa/Addis_Ababa": "ET", "Africa/Kampala": "UG", "Africa/Dar_es_Salaam": "TZ",
  // Americas
  "America/New_York": "US", "America/Chicago": "US", "America/Denver": "US", "America/Los_Angeles": "US",
  "America/Phoenix": "US", "America/Anchorage": "US", "America/Detroit": "US", "Pacific/Honolulu": "US",
  "America/Toronto": "CA", "America/Vancouver": "CA", "America/Edmonton": "CA", "America/Winnipeg": "CA",
  "America/Halifax": "CA", "America/Mexico_City": "MX", "America/Bogota": "CO", "America/Lima": "PE",
  "America/Santiago": "CL", "America/Argentina/Buenos_Aires": "AR", "America/Buenos_Aires": "AR",
  "America/Sao_Paulo": "BR", "America/Caracas": "VE", "America/Guatemala": "GT", "America/Panama": "PA",
  "America/Puerto_Rico": "PR", "America/Jamaica": "JM",
};

export function countryFromTimeZone(tz: string | null | undefined): string | null {
  if (!tz) return null;
  return ZONES[tz] ?? null;
}
