import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle } from 'lucide-react';
import BookButton from '@/components/shared/BookButton';
import PhoneLink from '@/components/shared/PhoneLink';
import { supabase } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Commissioner of Oaths Services Calgary | Calgary Oaths',
  description:
    'Affidavits, statutory declarations, travel consent letters, invitation letters, notarization & more in Calgary. Drafting available. Same-day service.',
  alternates: { canonical: 'https://calgaryoaths.com/services' },
  openGraph: {
    title: 'Commissioner of Oaths Services Calgary | Calgary Oaths',
    url: 'https://calgaryoaths.com/services',
  },
};

type DbService = {
  slug: string;
  name: string;
  short_description: string;
  price: number | null;
  price_label: string;
  category: string;
  is_in_house: boolean;
  requires_review: boolean;
};

async function getServices(): Promise<DbService[]> {
  const { data, error } = await supabase
    .from('co_services')
    .select('slug, name, short_description, price, price_label, category, is_in_house, requires_review')
    .eq('active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Failed to fetch services:', error.message);
    return [];
  }

  // Use lowest vendor rate as "From $X" price where available
  const { data: rates } = await supabase
    .from('co_vendor_rates')
    .select('service_slug, first_page_cents');

  if (rates?.length) {
    const minRateMap = new Map<string, number>();
    for (const r of rates) {
      if (r.first_page_cents == null) continue;
      const current = minRateMap.get(r.service_slug);
      if (current == null || r.first_page_cents < current) {
        minRateMap.set(r.service_slug, r.first_page_cents);
      }
    }
    for (const svc of data ?? []) {
      const minRate = minRateMap.get(svc.slug);
      if (minRate != null) {
        svc.price = minRate;
      }
    }
  }

  return data ?? [];
}

const categoryLabels: Record<string, string> = {
  commissioning: 'Commissioning Services',
  drafting: 'Drafting Services',
  notarization: 'Notarization Services',
};

const categoryDescriptions: Record<string, string> = {
  commissioning: 'Witnessing signatures, administering oaths, and certifying documents with an official seal.',
  drafting: 'Document drafting available at an extra charge — bring your ID and the details, we handle the rest.',
  notarization: 'Notarization and authentication services for legal, business, and international use.',
};

export default async function ServicesPage() {
  const allServices = await getServices();
  const displayServices = allServices.filter((s) => s.slug !== 'mobile-service');

  // Group by category
  const grouped: Record<string, DbService[]> = {};
  for (const s of displayServices) {
    const cat = s.category || 'commissioning';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  }

  const categoryOrder = ['commissioning', 'drafting', 'notarization'];

  return (
    <div className="py-12 lg:py-20">
      <div className="max-content">
        {/* Header */}
        <div className="mb-12">
          <nav className="text-sm text-mid-grey mb-4" aria-label="Breadcrumb">
            <a href="/" className="hover:text-gold">Home</a>
            <span className="mx-2">/</span>
            <span className="text-charcoal">Services</span>
          </nav>
          <h1 className="font-display font-bold text-4xl md:text-5xl text-navy mb-4">Our Document Services</h1>
          <p className="text-mid-grey text-lg max-w-2xl leading-relaxed">
            We commission legal documents so you don&apos;t have to figure it out alone.
            Bring your ID — we handle the official seal. Drafting available at extra charge.
          </p>
        </div>

        {/* Services grouped by category */}
        <div className="space-y-12 mb-12">
          {categoryOrder.map((cat) => {
            const services = grouped[cat];
            if (!services?.length) return null;
            return (
              <section key={cat}>
                <h2 className="font-display font-semibold text-2xl text-navy mb-2">{categoryLabels[cat] || cat}</h2>
                <p className="text-mid-grey text-sm mb-6">{categoryDescriptions[cat] || ''}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {services.map((svc) => (
                    <div key={svc.slug} className="card flex flex-col">
                      <h3 className="font-display font-semibold text-lg text-charcoal mb-2">{svc.name}</h3>
                      <p className="text-mid-grey text-sm leading-relaxed flex-1 mb-4">{svc.short_description}</p>
                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <span className="text-sm font-medium text-charcoal">
                          {svc.price != null ? (
                            <>From <span className="text-gold font-semibold">${(svc.price / 100).toFixed(0)}</span></>
                          ) : (
                            <span className="text-gold font-semibold">{svc.price_label}</span>
                          )}
                        </span>
                        <Link
                          href={`/services/${svc.slug}`}
                          className="text-sm text-gold hover:text-gold-light font-medium flex items-center gap-1 transition-colors"
                        >
                          Learn more <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* Mobile service callout */}
        <div className="card bg-gold/5 border-gold/20 mb-12">
          <h2 className="font-display font-semibold text-xl text-charcoal mb-2">Mobile Service Available</h2>
          <p className="text-mid-grey text-sm leading-relaxed mb-4">
            Can&apos;t come to us? We come to your home, office, hospital, or care facility.
            All standard services are available on-site. Travel fee applies based on distance.
          </p>
          <ul className="space-y-1.5 text-sm text-charcoal mb-4">
            <li className="flex items-start gap-2"><CheckCircle size={14} className="text-teal mt-0.5 flex-shrink-0" />All Calgary neighbourhoods</li>
            <li className="flex items-start gap-2"><CheckCircle size={14} className="text-teal mt-0.5 flex-shrink-0" />Airdrie, Cochrane, Chestermere by request</li>
            <li className="flex items-start gap-2"><CheckCircle size={14} className="text-teal mt-0.5 flex-shrink-0" />Hospitals and care facilities</li>
          </ul>
          <BookButton label="Book Mobile Service" variant="primary" size="md" />
        </div>

        {/* CTA */}
        <div className="bg-navy rounded-card p-8 text-center">
          <h2 className="font-display font-bold text-2xl text-white mb-3">
            Not sure which service you need?
          </h2>
          <p className="text-white/70 mb-6">Call us at <PhoneLink location="services" className="text-gold font-medium" /> and we&apos;ll point you in the right direction.</p>
          <BookButton label="Book Your Appointment" variant="primary" size="lg" />
        </div>
      </div>
    </div>
  );
}
