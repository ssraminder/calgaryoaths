import { MetadataRoute } from 'next';
import { services } from '@/lib/data/services';
import { blogPosts } from '@/lib/data/blog-posts';

const BASE = 'https://calgaryoaths.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const servicePages = services.map((s) => ({
    url: `${BASE}/services/${s.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  const blogPages = blogPosts.map((p) => ({
    url: `${BASE}/resources/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [
    { url: BASE, changeFrequency: 'weekly', priority: 1, lastModified: new Date() },
    { url: `${BASE}/services`, changeFrequency: 'monthly', priority: 0.9, lastModified: new Date() },
    ...servicePages,
    { url: `${BASE}/locations`, changeFrequency: 'monthly', priority: 0.9, lastModified: new Date() },
    { url: `${BASE}/locations/downtown-calgary`, changeFrequency: 'monthly', priority: 0.85, lastModified: new Date() },
    { url: `${BASE}/locations/northeast-calgary`, changeFrequency: 'monthly', priority: 0.85, lastModified: new Date() },
    { url: `${BASE}/pricing`, changeFrequency: 'monthly', priority: 0.8, lastModified: new Date() },
    { url: `${BASE}/about`, changeFrequency: 'monthly', priority: 0.7, lastModified: new Date() },
    { url: `${BASE}/faq`, changeFrequency: 'monthly', priority: 0.8, lastModified: new Date() },
    { url: `${BASE}/resources`, changeFrequency: 'weekly', priority: 0.7, lastModified: new Date() },
    ...blogPages,
    { url: `${BASE}/contact`, changeFrequency: 'yearly', priority: 0.7, lastModified: new Date() },
    { url: `${BASE}/join`, changeFrequency: 'monthly', priority: 0.6, lastModified: new Date() },
  ];
}
