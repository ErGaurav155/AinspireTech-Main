const { hostname } = require("os");

const nextConfig = {
  // CRITICAL: This tells Next.js to compile your local packages
  // Without this, Vercel throws "Module not found" for @rocketreplai/ui
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
