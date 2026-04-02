import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ServicePageLayout from '@/components/shared/ServicePageLayout';
import { services } from '@/lib/data/services';
import { supabase } from '@/lib/supabase';
import BookButton from '@/components/shared/BookButton';
import PhoneLink from '@/components/shared/PhoneLink';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

type DbService = {
  slug: string;
  name: string;
  short_description: string;
  price: number | null;
  price_label: string;
};

async function getDbService(slug: string): Promise<DbService | null> {
  const { data, error } = await supabase
    .from('co_services')
    .select('slug, name, short_description, price, price_label')
    .eq('slug', slug)
    .eq('active', true)
    .single();

  if (error || !data) return null;
  return data;
}

/** Try to find static service data — exact match first, then fuzzy match on slug substrings */
function findStaticService(slug: string) {
  // Exact match
  const exact = services.find((s) => s.slug === slug);
  if (exact) return exact;

  // Fuzzy: DB slug "affidavit-drafting" should match static slug "affidavit"
  // Check if static slug is contained in the DB slug or vice-versa
  return services.find(
    (s) => slug.includes(s.slug) || s.slug.includes(slug),
  ) ?? null;
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const staticService = findStaticService(slug);
  const dbService = !staticService ? await getDbService(slug) : null;

  const name = staticService?.name ?? dbService?.name ?? slug;
  const description = staticService?.shortDescription ?? dbService?.short_description ?? '';

  return {
    title: `${name} Calgary | Calgary Oaths`,
    description: description || `${name} service in Calgary. Same-day service available.`,
    alternates: { canonical: `https://calgaryoaths.com/services/${slug}` },
    openGraph: {
      title: `${name} Calgary | Calgary Oaths`,
      url: `https://calgaryoaths.com/services/${slug}`,
    },
  };
}

export default async function DynamicServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const staticService = findStaticService(slug);

  // If we have full static data, render the rich layout
  if (staticService) {
    return (
      <ServicePageLayout
        service={staticService}
        intro={staticService.shortDescription}
      />
    );
  }

  // Fall back to DB-only data
  const dbService = await getDbService(slug);
  if (!dbService) return notFound();

  const priceDisplay = dbService.price != null
    ? `$${(dbService.price / 100).toFixed(0)}`
    : dbService.price_label;

  return (
    <div className="py-12 lg:py-20">
      <div className="max-content">
        <nav className="text-sm text-mid-grey mb-6 flex items-center gap-1 flex-wrap" aria-label="Breadcrumb">
          <a href="/" className="hover:text-gold">Home</a>
          <ChevronRight size={14} />
          <a href="/services" className="hover:text-gold">Services</a>
          <ChevronRight size={14} />
          <span className="text-charcoal">{dbService.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-10">
            <div>
              <h1 className="font-display font-bold text-4xl md:text-5xl text-navy mb-4">
                {dbService.name} in Calgary
              </h1>
              <p className="text-mid-grey text-lg leading-relaxed">
                {dbService.short_description}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {priceDisplay && (
              <div className="card border-2 border-gold/20">
                <p className="text-xs font-medium uppercase tracking-wide text-mid-grey mb-2">Pricing</p>
                <p className="font-display font-bold text-4xl text-gold">
                  {dbService.price != null ? <>From {priceDisplay}</> : priceDisplay}
                </p>
              </div>
            )}

            <div className="card space-y-3">
              <p className="font-display font-semibold text-charcoal">Book your appointment</p>
              <BookButton label="Book Appointment" variant="primary" size="md" className="w-full justify-center" />
              <p className="text-xs text-mid-grey text-center">
                Or call <PhoneLink location="service_slug_page" className="text-gold font-medium" />
              </p>
            </div>

            <div className="card bg-bg border border-border">
              <p className="text-sm font-medium text-charcoal mb-1">Need mobile service?</p>
              <p className="text-xs text-mid-grey mb-3">We come to your home, office, or hospital across Calgary.</p>
              <Link href="/services/mobile-service" className="btn-ghost text-xs">
                Learn about mobile service →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
