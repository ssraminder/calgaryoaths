import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Clock, ArrowLeft } from 'lucide-react';
import { blogPosts } from '@/lib/data/blog-posts';
import BookButton from '@/components/shared/BookButton';
import SchemaSEO from '@/components/shared/SchemaSEO';

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = blogPosts.find((p) => p.slug === params.slug);
  if (!post) return {};
  return {
    title: `${post.title} | Calgary Oaths`,
    description: post.excerpt,
    alternates: { canonical: `https://calgaryoaths.com/resources/${post.slug}` },
    openGraph: { title: post.title, description: post.excerpt, url: `https://calgaryoaths.com/resources/${post.slug}` },
  };
}

export default function BlogPostPage({ params }: Props) {
  const post = blogPosts.find((p) => p.slug === params.slug);
  if (!post) notFound();

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    author: { '@type': 'Organization', name: 'Calgary Oaths' },
    publisher: { '@type': 'Organization', name: 'Calgary Oaths' },
    datePublished: post.date,
    url: `https://calgaryoaths.com/resources/${post.slug}`,
  };

  return (
    <>
      <SchemaSEO schema={articleSchema} />
      <div className="py-12 lg:py-20">
        <div className="max-content max-w-2xl mx-auto">
          {/* Breadcrumb */}
          <nav className="text-sm text-mid-grey mb-6 flex items-center gap-1 flex-wrap" aria-label="Breadcrumb">
            <a href="/" className="hover:text-gold">Home</a>
            <ChevronRight size={14} />
            <a href="/resources" className="hover:text-gold">Resources</a>
            <ChevronRight size={14} />
            <span className="text-charcoal truncate max-w-[200px]">{post.title}</span>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs bg-gold/10 text-gold px-2 py-0.5 rounded-pill font-medium">
                {post.category}
              </span>
              <span className="text-xs text-mid-grey flex items-center gap-1">
                <Clock size={11} /> {post.readTime}
              </span>
            </div>
            <h1 className="font-display font-bold text-3xl md:text-4xl text-navy mb-4">{post.title}</h1>
            <p className="text-mid-grey text-lg leading-relaxed">{post.excerpt}</p>
          </div>

          {/* Stub content */}
          <div className="bg-bg border border-border rounded-card p-8 text-center mb-10">
            <p className="text-mid-grey">Full article coming soon.</p>
          </div>

          {/* CTA */}
          <div className="bg-navy rounded-card p-6 md:p-8 text-center">
            <h2 className="font-display font-bold text-xl text-white mb-2">Ready to get your documents done?</h2>
            <p className="text-white/70 text-sm mb-5">Same-day service at both Calgary locations. Drafting from $120/hr.</p>
            <BookButton label="Book an appointment" variant="primary" />
          </div>

          <div className="mt-8 text-center">
            <Link href="/resources" className="text-gold hover:underline text-sm flex items-center justify-center gap-1">
              <ArrowLeft size={14} /> Back to all guides
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
