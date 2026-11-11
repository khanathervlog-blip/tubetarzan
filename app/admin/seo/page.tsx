import { CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { SITE_URL, SITEMAP_PAGES } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata = { title: "SEO & Indexing | Admin" };

function Item({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-[#CCCCCC]">
      {ok ? <CheckCircle2 className="w-4 h-4 text-[#22C55E] mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 text-[#FFD200] mt-0.5 shrink-0" />}
      <span>{children}</span>
    </li>
  );
}

function A({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-[#FFD200] hover:underline inline-flex items-center gap-1">
      {children} <ExternalLink className="w-3 h-3" />
    </a>
  );
}

export default async function SeoPage() {
  const verified = !!process.env.GOOGLE_SITE_VERIFICATION;
  const bing = !!process.env.BING_SITE_VERIFICATION;

  // Organic visits from search engines in the last 30 days (from the free visitor tracker)
  let search: { name: string; people: number; views: number }[] = [];
  try {
    const svc = await createServiceClient();
    const { data } = await svc.rpc("admin_visitor_stats", { p_days: 30 });
    search = ((data?.sources || []) as typeof search).filter((s) => ["Google", "Bing", "AI assistants"].includes(s.name));
  } catch {
    /* tracker not set up yet */
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">SEO & Google indexing</h1>
        <p className="text-[#555555] text-sm mt-1">What&apos;s already built in, and the one-time steps only you can do in Google Search Console.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
          <h2 className="text-white font-semibold text-sm mb-4">Built in</h2>
          <ul className="space-y-2">
            <Item ok>Titles, descriptions, keywords and canonical URL on every public page</Item>
            <Item ok>Open Graph / Twitter cards + share image (<A href={`${SITE_URL}/opengraph-image.png`}>preview</A>)</Item>
            <Item ok>Structured data: Organization, WebSite, SoftwareApplication with prices, FAQPage</Item>
            <Item ok><A href={`${SITE_URL}/sitemap.xml`}>sitemap.xml</A> with {SITEMAP_PAGES.length} public pages</Item>
            <Item ok><A href={`${SITE_URL}/robots.txt`}>robots.txt</A> blocks /api, /dashboard, /admin and account pages</Item>
            <Item ok>Dashboard, admin and account pages are marked noindex</Item>
            <Item ok>Static landing page (fast, cached on Vercel&apos;s CDN)</Item>
            <Item ok={verified}>Google verification tag {verified ? "is set" : "— set GOOGLE_SITE_VERIFICATION (step 2 below)"}</Item>
            <Item ok={bing}>Bing verification tag {bing ? "is set" : "— optional: BING_SITE_VERIFICATION"}</Item>
          </ul>
        </div>

        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
          <h2 className="text-white font-semibold text-sm mb-4">Organic visits (last 30 days)</h2>
          {search.length === 0 ? (
            <p className="text-[#555555] text-sm">No search-engine visits recorded yet. They appear here (and in Admin → Visitors) once Google starts sending traffic.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {search.map((s) => (
                <li key={s.name} className="flex justify-between text-[#CCCCCC]">
                  <span>{s.name}</span>
                  <span className="text-white font-semibold">{s.people} visitors · {s.views} views</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
        <h2 className="text-white font-semibold text-sm mb-4">Get indexed by Google (one time, ~10 minutes)</h2>
        <ol className="list-decimal list-inside space-y-3 text-sm text-[#CCCCCC]">
          <li>Open <A href="https://search.google.com/search-console">Google Search Console</A> → Add property → <b>URL prefix</b> → <span className="font-mono">{SITE_URL}</span>.</li>
          <li>Choose the <b>HTML tag</b> method. Copy only the <span className="font-mono">content=&quot;…&quot;</span> value, add it in Vercel → Settings → Environment Variables as <span className="font-mono text-[#FFD200]">GOOGLE_SITE_VERIFICATION</span>, redeploy, then press <b>Verify</b>. (Or use the <b>Domain</b> method with a DNS TXT record at your domain registrar.)</li>
          <li>Search Console → <b>Sitemaps</b> → enter <span className="font-mono">sitemap.xml</span> → Submit.</li>
          <li><b>URL inspection</b> → paste the homepage URL → <b>Request indexing</b>. Repeat for /signup and /blog.</li>
          <li>Optional: <A href="https://www.bing.com/webmasters">Bing Webmaster Tools</A> → Import from Google Search Console (also covers DuckDuckGo and Yahoo).</li>
          <li>Check rich results with the <A href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(SITE_URL)}`}>Rich Results Test</A> and speed with <A href={`https://pagespeed.web.dev/analysis?url=${encodeURIComponent(SITE_URL)}`}>PageSpeed Insights</A>.</li>
        </ol>
        <p className="text-[#555555] text-xs mt-4">
          Indexing usually takes a few days. Rankings come from useful content and links: publishing regular blog posts that answer
          searches like &quot;YouTube outlier finder&quot;, &quot;faceless channel ideas&quot; or &quot;VidIQ alternative&quot; is what grows organic traffic over time.
        </p>
      </div>

      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
        <h2 className="text-white font-semibold text-sm mb-4">Pages in the sitemap</h2>
        <ul className="grid sm:grid-cols-2 gap-2 text-sm">
          {SITEMAP_PAGES.map((p) => (
            <li key={p.path} className="flex justify-between gap-3 text-[#CCCCCC]">
              <A href={`${SITE_URL}${p.path}`}>{p.path}</A>
              <span className="text-[#555555] text-xs">priority {p.priority}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
