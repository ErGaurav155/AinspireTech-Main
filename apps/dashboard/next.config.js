const nextConfig = {
  // CRITICAL: This tells Next.js to compile your local packages
  // Without this, Vercel throws "Module not found" for @rocketreplai/ui
  transpilePackages: ["@rocketreplai/ui", "@rocketreplai/shared"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
};
module.exports = nextConfig;
