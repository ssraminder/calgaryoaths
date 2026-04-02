const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  scope: '/vendor',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      // Cache vendor page shell
      urlPattern: /^\/vendor(\/.*)?$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'vendor-pages',
        expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
        networkTimeoutSeconds: 3,
      },
    },
    {
      // Cache vendor API data (profile, settings)
      urlPattern: /^\/api\/vendor\/(settings|profile)/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'vendor-api-data',
        expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 },
      },
    },
    {
      // Cache static assets
      urlPattern: /\/_next\/static\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
    {
      // Cache fonts
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
    {
      // Cache images from Supabase storage
      urlPattern: /^https:\/\/ogxklbdjffbhtlabwonl\.supabase\.co\/storage\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'supabase-images',
        expiration: { maxEntries: 32, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
  ],
});

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

module.exports = withPWA(nextConfig);
