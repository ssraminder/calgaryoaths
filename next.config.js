const path = require('path');

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  // Scope set to '/' so the same SW serves both the /vendor PWA (partner phone) and
  // the /tablet PWA (in-store tablet kiosk). Manifests for each are at /manifest.json
  // and /tablet-manifest.json.
  scope: '/',
  register: true,
  skipWaiting: true,
  importScripts: ['/push-sw.js'],
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
      // Cache tablet page shell
      urlPattern: /^\/tablet(\/.*)?$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'tablet-pages',
        expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
        networkTimeoutSeconds: 3,
      },
    },
    {
      // Cache orders API GETs for offline draft viewing
      urlPattern: /^\/api\/orders(\/.*)?$/,
      handler: 'NetworkFirst',
      method: 'GET',
      options: {
        cacheName: 'orders-api',
        expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 },
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
