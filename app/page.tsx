import type { Metadata } from 'next';
import Hero from '@/components/home/Hero';
import TrustBar from '@/components/home/TrustBar';
import ServicesGrid from '@/components/home/ServicesGrid';
import HowItWorks from '@/components/home/HowItWorks';
import WhyUs from '@/components/home/WhyUs';
import LocationsSection from '@/components/home/LocationsSection';
import ReviewsSection from '@/components/home/ReviewsSection';
import FaqPreview from '@/components/home/FaqPreview';
import CtaBand from '@/components/home/CtaBand';
import CommissionerCard from '@/components/shared/CommissionerCard';
import SchemaSEO from '@/components/shared/SchemaSEO';
import { getCommissioners, getLocations, getSettings, dbToCommissioner } from '@/lib/data/db';

export const metadata: Metadata = {
  title: 'Commissioner of Oaths Calgary | Same-Day Service | Calgary Oaths',
  description:
    'Professional Commissioner of Oaths in Calgary. Affidavits, statutory declarations, travel consent letters & more. 2 commissioners, 2 locations + mobile. From $30. Book today.',
  alternates: {
    canonical: 'https://calgaryoaths.com',
  },
  openGraph: {
    title: 'Commissioner of Oaths Calgary | Same-Day Service | Calgary Oaths',
    description:
      'Professional Commissioner of Oaths in Calgary. Affidavits, statutory declarations, travel consent letters & more. 2 commissioners, 2 locations + mobile. From $30. Book today.',
    url: 'https://calgaryoaths.com',
    siteName: 'Calgary Oaths',
    type: 'website',
  },
};

const homepageSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'Calgary Oaths',
      url: 'https://calgaryoaths.com',
      telephone: '+15876000746',
      email: 'info@calgaryoaths.com',
      legalName: 'Cethos Solutions Inc.',
    },
    {
      '@type': 'LocalBusiness',
      '@id': 'https://calgaryoaths.com/#downtown',
      name: 'Calgary Oaths — Downtown',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '815 17th Ave SW',
        addressLocality: 'Calgary',
        addressRegion: 'AB',
        postalCode: 'T2T 0A1',
        addressCountry: 'CA',
      },
      telephone: '+15876000746',
      openingHours: ['Mo-Fr 09:00-21:00', 'Sa 10:00-17:00'],
      priceRange: '$',
    },
    {
      '@type': 'LocalBusiness',
      '@id': 'https://calgaryoaths.com/#northeast',
      name: 'Calgary Oaths — NE Calgary',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '155 Redstone Walk NE',
        addressLocality: 'Calgary',
        addressRegion: 'AB',
        postalCode: 'T3J 0S4',
        addressCountry: 'CA',
      },
      telephone: '+15876000746',
      openingHours: ['Mo-Fr 09:00-21:00', 'Sa 10:00-17:00'],
      priceRange: '$',
    },
    {
      '@type': 'AggregateRating',
      itemReviewed: { '@type': 'LocalBusiness', name: 'Calgary Oaths' },
      ratingValue: '4.9',
      reviewCount: '106',
    },
  ],
};

export default async function HomePage() {
  const [dbCommissioners, dbLocations, settings] = await Promise.all([
    getCommissioners(),
    getLocations(),
    getSettings(),
  ]);

  const commissioners = dbCommissioners.map(dbToCommissioner);
  const commissionerCount = commissioners.length || 2;
  const locationCount = dbLocations.length || 2;
  const startingPrice = parseInt(settings.starting_price ?? '30', 10);

  return (
    <>
      <SchemaSEO schema={homepageSchema} />

      <Hero
        commissionerCount={commissionerCount}
        locationCount={locationCount}
        startingPrice={startingPrice}
      />
      <TrustBar />

      {/* Meet Our Commissioners */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-content">
          <div className="text-center mb-12">
            <h2 className="section-heading text-3xl md:text-4xl">Meet our commissioners</h2>
            <p className="text-mid-grey mt-3 max-w-xl mx-auto">
              Two certified commissioners across Calgary — choose the location and language that works for you.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {(commissioners.length ? commissioners : []).map((c) => (
              <CommissionerCard key={c.id} commissioner={c} size="compact" />
            ))}
          </div>
        </div>
      </section>

      <ServicesGrid />
      <HowItWorks />
      <WhyUs />
      <LocationsSection />
      <ReviewsSection />
      <FaqPreview />
      <CtaBand />
    </>
  );
}
