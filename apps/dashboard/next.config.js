const { hostname } = require("os");

const nextConfig = {
  // CRITICAL: This tells Next.js to compile your local packages
  // Without this, Vercel throws "Module not found" for @rocketreplai/ui

  async headers() {
    return [
      // ── Widget embed route: allow any site to iframe this ──────────────
      {
        source: "/embed/:path*",
        headers: [
          // NO X-Frame-Options — allow embedding in customer sites
          // frame-ancestors * achieves the same via CSP
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Your Railway API
              `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL || "https://api.rocketreplai.com"}`,
              "style-src 'self' 'unsafe-inline'",
              "script-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "frame-src 'none'",
              "frame-ancestors *", // ← allows any customer site to embed the iframe
            ].join("; "),
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },

      // ── Public JS files in /public: allow any site to load them ───────
      {
        source: "/:file(chatbotembed|mcqchatbotembed).js",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },

      // ── All other routes: strict headers ──────────────────────────────
      {
        source: "/((?!embed/).*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  transpilePackages: ["@rocketreplai/ui", "@rocketreplai/shared"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "scontent.cdninstagram.com" },
      { protocol: "https", hostname: "instagram.fdad1-1.fna.fbcdn.net" },
      { protocol: "https", hostname: "instagram.fdad2-1.fna.fbcdn.net" },
      { protocol: "https", hostname: "instagram.fnag6-3.fna.fbcdn.net" },
      // Wildcard patterns for all CDN and Instagram domains
      { protocol: "https", hostname: "**.cdninstagram.com" },
      { protocol: "https", hostname: "**.instagram.com" },
      { protocol: "https", hostname: "**.fbcdn.net" },
    ],
  },
};
module.exports = nextConfig;
