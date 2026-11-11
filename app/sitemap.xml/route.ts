import { NextResponse } from "next/server";
import { SITE_URL, SITEMAP_PAGES } from "@/lib/site";

// Static: generated at build time and served from the CDN.
export const dynamic = "force-static";

export async function GET() {
  const lastmod = new Date().toISOString().split("T")[0];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${SITEMAP_PAGES.map(
  (p) => `  <url>
    <loc>${SITE_URL}${p.path === "/" ? "/" : p.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
).join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
    },
  });
}
