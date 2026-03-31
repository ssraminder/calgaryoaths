import type { Metadata } from 'next';
import ServiceCard from '@/components/shared/ServiceCard';
import { services } from '@/lib/data/services';
import BookButton from '@/components/shared/BookButton';

export const metadata: Metadata = {
  title: 'Commissioner of Oaths Services Calgary | Calgary Oaths',
  description:
    'Affidavits, statutory declarations, travel consent letters, invitation letters, apostille & mobile service in Calgary. Drafting included. From $30. Same-day available.',
  alternates: { canonical: 'https://calgaryoaths.com/services' },
  openGraph: {
    title: 'Commissioner of Oaths Services Calgary | Calgary Oaths',
    url: 'https://calgaryoaths.com/services',
  },
};

export default function ServicesPage() {
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
            We draft, print, and commission legal documents so you don't have to figure it out alone.
            Bring your ID — we handle the formatting, wording, and official seal.
          </p>
        </div>

        {/* Service blocks */}
        <div className="space-y-6 mb-12">
          {services.map((service) => (
            <ServiceCard key={service.slug} service={service} variant="block" />
          ))}
        </div>

        {/* CTA */}
        <div className="bg-navy rounded-card p-8 text-center">
          <h2 className="font-display font-bold text-2xl text-white mb-3">
            Not sure which service you need?
          </h2>
          <p className="text-white/70 mb-6">Call us at <a href="tel:5876000746" className="text-gold font-medium">(587) 600-0746</a> and we'll point you in the right direction.</p>
          <BookButton label="Book Your Appointment" variant="primary" size="lg" />
        </div>
      </div>
    </div>
  );
}
