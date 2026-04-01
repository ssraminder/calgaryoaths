/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: false,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ogxklbdjffbhtlabwonl.supabase.co',
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['calgaryoaths.com', 'www.calgaryoaths.com'],
    },
  },
};

module.exports = nextConfig;
