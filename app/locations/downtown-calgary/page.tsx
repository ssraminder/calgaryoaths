import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, CheckCircle } from 'lucide-react';
import LocationCard from '@/components/shared/LocationCard';
import { commissioners } from '@/lib/data/commissioners';
import { services } from '@/lib/data/services';

const c = commissioners[0]; // Raminder Shah

export const metadata: Metadata = {
  title: 'Commissioner of Oaths Downtown Calgary | Walk-Ins Welcome | Calgary Oaths',
  description:
    'Commissioner of Oaths in Downtown Calgary (17th Ave SW). Raminder Shah — Commissioner of Oaths. Same-day service, walk-ins welcome. Open until 9 PM weekdays.',
  alternates: { canonical: 'https://calgaryoaths.com/locations/downtown-calgary' },
  openGraph: { title: 'Downtown Calgary Commissioner of Oaths | Calgary Oaths', url: 'https://calgaryoaths.com/locations/downtown-calgary' },
};

export default function DowntownCalgaryPage() {
  return (
    <div className="py-12 lg:py-20">
      <div className="max-content">
        <nav className="text-sm text-mid-grey mb-6 flex items-center gap-1 flex-wrap" aria-label="Breadcrumb">
          <a href="/" className="hover:text-gold">Home</a>
          <ChevronRight size={14} />
          <a href="/locations" className="hover:text-gold">Locations</a>
          <ChevronRight size={14} />
          <span className="text-charcoal">Downtown Calgary</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-10">
            <div>
              <h1 className="font-display font-bold text-4xl md:text-5xl text-navy mb-4">
                Commissioner of Oaths — Downtown Calgary
              </h1>
              <p className="text-mid-grey text-lg leading-relaxed">
                Our Downtown Calgary location on 17th Ave SW serves clients from across the Beltline, Mission,
                Victoria Park, and the Downtown Core. Raminder Shah is a Commissioner of Oaths,
                available for same-day appointments and walk-ins Monday through Saturday.
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
                Serving Downtown and surrounding neighbourhoods
              </h2>
              <p className="text-mid-grey leading-relaxed mb-4">
                Located at 815 – 17th Ave SW, our downtown office is easily accessible from the Beltline, Mission,
                Cliff Bungalow, and Victoria Park. We also serve clients who work in the Downtown Core and need
                documents commissioned during business hours or after work.
              </p>
              <p className="text-mid-grey leading-relaxed">
                Metered street parking is available on 17th Ave SW, and paid parking lots are within one block.
                Transit access is excellent via the nearby CTrain stations.
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
              name="Downtown Calgary"
              commissionerName={c.name}
              commissionerTitle={c.title}
              address={c.address}
              parking="Metered street parking on 17th Ave SW. Pay parking lots within 1 block."
              nearbyNeighbourhoods={c.nearbyNeighbourhoods}
              googleMapsEmbed={c.googleMapsEmbed}
              mapUrl={c.mapUrl}
              calendlyUrl={c.calendlyUrl}
              hours={c.hours}
              languages={c.languages}
              geo={{ latitude: 51.0355, longitude: -114.0826 }}
              schemaId="https://calgaryoaths.com/#downtown"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
