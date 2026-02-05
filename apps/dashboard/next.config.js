/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/api/scrape-anu",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "scontent.cdninstagram.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "instagram.fdad1-1.fna.fbcdn.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "instagram.fdad2-1.fna.fbcdn.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "instagram.fnag6-3.fna.fbcdn.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.cdninstagram.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.instagram.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.fbcdn.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
        pathname: "/**",
      },
    ],
  },

  serverExternalPackages: ["@sparticuz/chromium-min", "puppeteer-core"],
};

module.exports = nextConfig;
