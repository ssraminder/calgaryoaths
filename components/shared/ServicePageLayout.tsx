import Link from 'next/link';
import { CheckCircle, ChevronRight } from 'lucide-react';
import { Service, services } from '@/lib/data/services';
import FaqAccordion from '@/components/shared/FaqAccordion';
import SchemaSEO from '@/components/shared/SchemaSEO';
import BookButton from '@/components/shared/BookButton';
import PhoneLink from '@/components/shared/PhoneLink';
import { commissioners } from '@/lib/data/commissioners';

interface ServicePageLayoutProps {
  service: Service;
  intro: string;
}

export default function ServicePageLayout({ service, intro }: ServicePageLayoutProps) {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: service.faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.name,
    description: service.shortDescription,
    provider: { '@type': 'LocalBusiness', name: 'Calgary Oaths', telephone: '+15876000746' },
    areaServed: { '@type': 'City', name: 'Calgary' },
    offers: { '@type': 'Offer', price: service.priceFrom.replace(/[^0-9]/g, '') || '30', priceCurrency: 'CAD' },
  };

  const relatedServices = services.filter((s) => s.slug !== service.slug).slice(0, 2);

  return (
    <>
      <SchemaSEO schema={serviceSchema} />
      <SchemaSEO schema={faqSchema} />

      <div className="py-12 lg:py-20">
        <div className="max-content">
          <nav className="text-sm text-mid-grey mb-6 flex items-center gap-1 flex-wrap" aria-label="Breadcrumb">
            <a href="/" className="hover:text-gold">Home</a>
            <ChevronRight size={14} />
            <a href="/services" className="hover:text-gold">Services</a>
            <ChevronRight size={14} />
            <span className="text-charcoal">{service.name}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-10">
              <div>
                <h1 className="font-display font-bold text-4xl md:text-5xl text-navy mb-4">
                  {service.name} in Calgary
                </h1>
                <p className="text-mid-grey text-lg leading-relaxed">{intro}</p>
              </div>

              {/* Common uses */}
              <div>
                <h2 className="font-display font-semibold text-2xl text-charcoal mb-4">Common uses</h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {service.commonUses.map((use, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-charcoal">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />
                      {use}
                    </li>
                  ))}
                </ul>
              </div>

              {/* What's included + What to bring */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h2 className="font-display font-semibold text-xl text-charcoal mb-3">{"What's included"}</h2>
                  <ul className="space-y-2">
                    {service.what.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-charcoal">
                        <CheckCircle size={16} className="text-teal mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h2 className="font-display font-semibold text-xl text-charcoal mb-3">What to bring</h2>
                  <ul className="space-y-2">
                    {service.bring.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-charcoal">
                        <ChevronRight size={16} className="text-navy mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Note if present */}
              {'note' in service && service.note && (
                <div className="bg-gold/5 border border-gold/20 rounded-card p-4">
                  <p className="text-sm text-charcoal leading-relaxed">{service.note as string}</p>
                </div>
              )}

              {/* FAQ */}
              <div>
                <h2 className="font-display font-semibold text-2xl text-charcoal mb-4">
                  Questions about {service.name.toLowerCase()}
                </h2>
                <FaqAccordion items={service.faq.map((f) => ({ question: f.q, answer: f.a }))} />
              </div>

              {/* Related services */}
              <div>
                <h2 className="font-display font-semibold text-xl text-charcoal mb-4">Related services</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {relatedServices.map((s) => (
                    <Link key={s.slug} href={`/services/${s.slug}`} className="card hover:shadow-card-hover transition-shadow group">
                      <p className="font-medium text-charcoal group-hover:text-navy">{s.name}</p>
                      <p className="text-sm text-mid-grey mt-1">{s.shortDescription}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Pricing */}
              <div className="card border-2 border-gold/20">
                <p className="text-xs font-medium uppercase tracking-wide text-mid-grey mb-2">Pricing</p>
                <p className="font-display font-bold text-4xl text-gold">{service.priceFrom}</p>
                <p className="text-sm text-mid-grey mt-1">{service.priceNote}</p>
              </div>

              {/* Book CTAs */}
              <div className="card space-y-3">
                <p className="font-display font-semibold text-charcoal">Book your appointment</p>
                <BookButton label="Book Appointment" variant="primary" size="md" className="w-full justify-center" />
                <p className="text-xs text-mid-grey text-center">
                  Or call <PhoneLink location="service_page" className="text-gold font-medium" />
                </p>
              </div>

              {/* Mobile note */}
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
    </>
  );
}
