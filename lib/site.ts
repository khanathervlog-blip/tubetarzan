import type { Metadata } from "next";

/** Site-wide SEO settings. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://tubetarzan.com").replace(/\/+$/, "");
export const SITE_NAME = "TubeTarzan";
export const SITE_TAGLINE = "Find viral YouTube video ideas in 60 seconds";
export const SITE_DESCRIPTION =
  "TubeTarzan finds viral YouTube video ideas in your niche in 60 seconds using real VPH (views per hour) and outlier scores, then writes the title, hook, script and thumbnail text. The affordable VidIQ and TubeBuddy alternative.";

export const SITE_KEYWORDS = [
  "YouTube video ideas",
  "viral YouTube ideas",
  "YouTube outlier finder",
  "YouTube outlier score",
  "VPH calculator",
  "views per hour YouTube",
  "VidIQ alternative",
  "TubeBuddy alternative",
  "YouTube SEO tool",
  "YouTube keyword research",
  "YouTube title generator",
  "YouTube thumbnail text ideas",
  "YouTube script writer AI",
  "YouTube automation tool",
  "faceless YouTube channel ideas",
  "YouTube competitor analysis",
  "YouTube niche finder",
  "YouTube RPM by niche",
  "YouTube Shorts ideas",
  "YouTube growth tool",
];

/** Metadata for a public page: title, description, canonical URL, Open Graph and Twitter cards. */
export function pageMetadata(opts: { title: string; description: string; path: string; keywords?: string[]; noindex?: boolean }): Metadata {
  const url = `${SITE_URL}${opts.path === "/" ? "" : opts.path}`;
  return {
    title: opts.title,
    description: opts.description,
    keywords: [...(opts.keywords || []), ...SITE_KEYWORDS.slice(0, 8)],
    alternates: { canonical: url },
    openGraph: { title: `${opts.title} | ${SITE_NAME}`, description: opts.description, url, siteName: SITE_NAME, type: "website" },
    twitter: { card: "summary_large_image", title: `${opts.title} | ${SITE_NAME}`, description: opts.description },
    ...(opts.noindex ? { robots: { index: false, follow: false } } : {}),
  };
}

/** Public pages listed in sitemap.xml (keep in sync with real routes). */
export const SITEMAP_PAGES: { path: string; changefreq: "daily" | "weekly" | "monthly" | "yearly"; priority: string }[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/signup", changefreq: "monthly", priority: "0.8" },
  { path: "/blog", changefreq: "weekly", priority: "0.8" },
  { path: "/about", changefreq: "monthly", priority: "0.6" },
  { path: "/roadmap", changefreq: "weekly", priority: "0.5" },
  { path: "/changelog", changefreq: "weekly", priority: "0.5" },
  { path: "/contact", changefreq: "monthly", priority: "0.5" },
  { path: "/login", changefreq: "monthly", priority: "0.4" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/cookies", changefreq: "yearly", priority: "0.2" },
];
