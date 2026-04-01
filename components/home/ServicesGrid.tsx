import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type DbService = {
  slug: string;
  name: string;
  short_description: string;
  price: number | null;
  price_label: string;
};

async function getActiveServices(): Promise<DbService[]> {
  const { data, error } = await supabase
    .from('co_services')
    .select('slug, name, short_description, price, price_label')
    .eq('active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Failed to fetch services for grid:', error.message);
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

export default async function ServicesGrid() {
  const allServices = await getActiveServices();
  const displayServices = allServices.filter((s) => s.slug !== 'mobile-service');
  const topServices = displayServices.slice(0, 6);

  return (
    <section className="py-16 lg:py-24 bg-bg">
      <div className="max-content">
        <div className="text-center mb-12">
          <h2 className="section-heading text-3xl md:text-4xl">Documents we commission for you</h2>
          <p className="text-mid-grey mt-3 max-w-xl mx-auto">
            Professional commissioning services — bring your ID and we handle the rest. Drafting available at extra charge.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {topServices.map((service) => (
            <div
              key={service.slug}
              className="card hover:shadow-card-hover transition-shadow duration-200 flex flex-col"
            >
              <h3 className="font-display font-semibold text-lg text-charcoal mb-2">
                {service.name}
              </h3>
              <p className="text-mid-grey text-sm leading-relaxed flex-1 mb-4">
                {service.short_description}
              </p>
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <span className="text-sm font-medium text-charcoal">
                  {service.price != null ? (
                    <>From <span className="text-gold font-semibold">${(service.price / 100).toFixed(0)}</span></>
                  ) : (
                    <span className="text-gold font-semibold">{service.price_label}</span>
                  )}
                </span>
                <Link
                  href={`/services/${service.slug}`}
                  className="text-sm text-gold hover:text-gold-light font-medium flex items-center gap-1 transition-colors"
                >
                  Learn more <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {displayServices.length > 6 && (
          <div className="text-center mt-8">
            <Link href="/services" className="btn-ghost text-base">
              View all {displayServices.length} services <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
