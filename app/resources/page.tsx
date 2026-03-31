import type { Metadata } from 'next';
import Link from 'next/link';
import { blogPosts, blogCategories } from '@/lib/data/blog-posts';
import { Clock, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Commissioner of Oaths Resources & Guides | Calgary Oaths',
  description:
    'Guides on affidavits, statutory declarations, travel consent letters, IRCC invitation letters, apostille and more — from Calgary Oaths.',
  alternates: { canonical: 'https://calgaryoaths.com/resources' },
  openGraph: { title: 'Resources & Guides | Calgary Oaths', url: 'https://calgaryoaths.com/resources' },
};

export default function ResourcesPage() {
  return (
    <div className="py-12 lg:py-20">
      <div className="max-content">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-display font-bold text-4xl md:text-5xl text-navy mb-4">Guides & Resources</h1>
          <p className="text-mid-grey text-lg max-w-xl mx-auto">
            Plain-language guides on affidavits, declarations, travel consent, and more — so you know exactly what to bring.
          </p>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          <span className="px-3 py-1.5 rounded-pill bg-navy text-white text-sm font-medium">All</span>
          {blogCategories.map((cat) => (
            <span key={cat} className="px-3 py-1.5 rounded-pill bg-bg border border-border text-charcoal text-sm font-medium hover:border-gold hover:text-gold transition-colors cursor-pointer">
              {cat}
            </span>
          ))}
        </div>

        {/* Blog grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {blogPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/resources/${post.slug}`}
              className="card hover:shadow-card-hover transition-shadow duration-200 group flex flex-col"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs bg-gold/10 text-gold px-2 py-0.5 rounded-pill font-medium">
                  {post.category}
                </span>
                <span className="text-xs text-mid-grey flex items-center gap-1">
                  <Clock size={11} /> {post.readTime}
                </span>
              </div>
              <h2 className="font-display font-semibold text-base text-charcoal group-hover:text-navy transition-colors mb-2 flex-1">
                {post.title}
              </h2>
              <p className="text-mid-grey text-sm leading-relaxed mb-4">{post.excerpt}</p>
              <span className="text-gold text-sm font-medium flex items-center gap-1 mt-auto">
                Read more <ArrowRight size={14} />
              </span>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="bg-navy/5 border border-navy/10 rounded-card p-6 text-center">
          <p className="text-charcoal font-medium mb-2">Need help with a specific document?</p>
          <p className="text-mid-grey text-sm mb-4">Our commissioners can draft it for you — same day, from $30.</p>
          <a href="/contact" className="btn-primary inline-flex">Get in touch</a>
        </div>
      </div>
    </div>
  );
}
