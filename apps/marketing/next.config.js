/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@rocketreplai/ui", "@rocketreplai/shared"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
};

module.exports = nextConfig;
