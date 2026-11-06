/** @type {import('next').NextConfig} */
const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "X-XSS-Protection",
    value: "0",
  },
  /**
   * Content Security Policy (CSP) - Architectural Tradeoff Analysis (ADR 0005):
   * 1. 'unsafe-inline' in script-src & style-src:
   *    - Required by Next.js 16 App Router for streaming RSC hydration (self.__next_f.push)
   *      and Tailwind CSS runtime styles on edge-cached static pages (SRS NFR-PER-02).
   *    - Using dynamic nonces exclusively would disable Vercel Edge CDN caching for 100k readers.
   * 2. Compensating Mitigations in place:
   *    - React 19 automatic output encoding prevents reflected/stored XSS.
   *    - Strict ban on dangerouslySetInnerHTML (Rule R8).
   *    - Server-side Zod input sanitization across all forms.
   *    - Restrictive connect-src, object-src 'none', base-uri 'self', frame-ancestors 'none'.
   * 3. Evolution: In Phase 6/7, dynamic routes (admin, auth) can introduce per-request nonces
   *    via Next.js middleware while keeping public routes edge-cacheable.
   */
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://*.upstash.io https://*.sentry.io https://challenges.cloudflare.com https://*.vercel-insights.com https://va.vercel-scripts.com",
      "frame-src 'self' https://challenges.cloudflare.com",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    turbopackPluginRuntimeStrategy: "forceWorkerThreads",
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
