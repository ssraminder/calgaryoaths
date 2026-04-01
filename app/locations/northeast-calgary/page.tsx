import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, CheckCircle } from 'lucide-react';
import LocationCard from '@/components/shared/LocationCard';
import { commissioners } from '@/lib/data/commissioners';
import { services } from '@/lib/data/services';

const c = commissioners[1]; // Amrita Shah

export const metadata: Metadata = {
  title: 'Commissioner of Oaths NE Calgary (Redstone) | Walk-Ins Welcome | Calgary Oaths',
  description:
    'Commissioner of Oaths in NE Calgary — Red Sky. Amrita Shah. Same-day service, by appointment. Serving Redstone, Cornerstone, Cityscape, Country Hills and surrounding areas.',
  alternates: { canonical: 'https://calgaryoaths.com/locations/northeast-calgary' },
  openGraph: { title: 'NE Calgary Commissioner of Oaths | Calgary Oaths', url: 'https://calgaryoaths.com/locations/northeast-calgary' },
};

export default function NortheastCalgaryPage() {
  return (
    <div className="py-12 lg:py-20">
      <div className="max-content">
        <nav className="text-sm text-mid-grey mb-6 flex items-center gap-1 flex-wrap" aria-label="Breadcrumb">
          <a href="/" className="hover:text-gold">Home</a>
          <ChevronRight size={14} />
          <a href="/locations" className="hover:text-gold">Locations</a>
          <ChevronRight size={14} />
          <span className="text-charcoal">NE Calgary</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-10">
            <div>
              <h1 className="font-display font-bold text-4xl md:text-5xl text-navy mb-4">
                Commissioner of Oaths — NE Calgary (Redstone)
              </h1>
              <p className="text-mid-grey text-lg leading-relaxed">
                Our NE Calgary location in the Redstone community serves clients from across Northeast Calgary —
                including Redstone, Cornerstone, Cityscape, Country Hills, Saddle Ridge, Falconridge, and Taradale.
                Amrita Shah offers same-day commissioning in a welcoming, multilingual environment — fluent in
                English, Punjabi, Hindi, and Gujarati.
              </p>
            </div>

            {/* Services available */}
            <div>
              <h2 className="font-display font-semibold text-2xl text-charcoal mb-4">
                Services available at this location
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map((s) => (
                  <Link key={s.slug} href={`/services/${s.slug}`} className="flex items-center gap-2 text-sm text-charcoal hover:text-gold transition-colors">
                    <CheckCircle size={15} className="text-teal flex-shrink-0" />
                    {s.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Neighbourhood SEO content */}
            <div>
              <h2 className="font-display font-semibold text-2xl text-charcoal mb-4">
                Serving NE Calgary and surrounding communities
              </h2>
              <p className="text-mid-grey leading-relaxed mb-4">
                Located at 220 Red Sky Terrace NE within the NE Calgary community, this office is convenient for
                residents of Northeast Calgary. Free parking is available nearby.
              </p>
              <p className="text-mid-grey leading-relaxed">
                NE Calgary has one of the most diverse and multicultural populations in Calgary. Amrita Shah&apos;s
                multilingual capabilities — English, Punjabi, Hindi, and Gujarati — make this location
                particularly accessible for the South Asian community and recent immigrants to Canada.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {c.nearbyNeighbourhoods.map((n) => (
                  <span key={n} className="text-xs bg-bg text-charcoal px-3 py-1 rounded-pill border border-border">
                    {n}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar — Location card */}
          <div>
            <LocationCard
              name="NE Calgary — Redstone"
              commissionerName={c.name}
              commissionerTitle={c.title}
              address={c.address}
              parking="Free parking available nearby."
              nearbyNeighbourhoods={c.nearbyNeighbourhoods}
              googleMapsEmbed={c.googleMapsEmbed}
              mapUrl={c.mapUrl}
              calendlyUrl={c.calendlyUrl}
              hours={c.hours}
              languages={c.languages}
              geo={{ latitude: 51.1645, longitude: -113.9742 }}
              schemaId="https://calgaryoaths.com/#northeast"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
