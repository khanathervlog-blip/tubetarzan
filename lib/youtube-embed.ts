/** Turns any YouTube link (watch, youtu.be, shorts, embed) or a bare 11-character ID into a safe embed URL. "" if it is not YouTube. */
export function toEmbedUrl(input?: string | null): string {
  const v = (input || "").trim();
  if (!v) return "";
  const m = v.match(/^([A-Za-z0-9_-]{11})$/) || v.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : "";
}

export interface LandingVideo { url: string; title?: string }

/** Parses the saved JSON list of extra landing-page videos (max 6, YouTube only). */
export function parseLandingVideos(raw?: string): LandingVideo[] {
  try {
    const arr = JSON.parse(raw || "[]");
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x: { url?: string; title?: string }) => ({ url: toEmbedUrl(x?.url), title: String(x?.title || "").slice(0, 100) }))
      .filter((x) => x.url)
      .slice(0, 6);
  } catch {
    return [];
  }
}
