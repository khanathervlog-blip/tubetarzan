/** @type {import('next').NextConfig} */

// Content-Security-Policy: only the sources the app really uses.
//  - 'unsafe-inline' scripts: Next.js 14 injects inline bootstrap scripts (no nonce setup yet)
//  - 'wasm-unsafe-eval' + blob: + unpkg: ffmpeg.wasm (Lip Sync cuts clips in the browser)
//  - images/media from any https host (YouTube, Pexels, Pixabay, AI image/video CDNs) - they can't run code
//  - vercel.live: Vercel's preview toolbar (preview deployments only)
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: https://unpkg.com https://vercel.live",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // blob: - ffmpeg.wasm (Lip Sync) fetches its video file and wasm core through blob: URLs
  "connect-src 'self' blob: https://*.supabase.co wss://*.supabase.co https://unpkg.com https://videos.pexels.com https://*.pexels.com https://vercel.live wss://ws-us3.pusher.com",
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://vercel.live",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
