import { MapPin, Clock, ExternalLink, Globe } from 'lucide-react';
import SchemaSEO from '@/components/shared/SchemaSEO';
import BookButton from '@/components/shared/BookButton';

interface LocationCardProps {
  name: string;
  commissionerName: string;
  commissionerTitle: string;
  address: string;
  parking: string;
  nearbyNeighbourhoods: readonly string[];
  googleMapsEmbed: string;
  mapUrl: string;
  calendlyUrl: string;
  hours: { weekdays: string; saturday: string; sunday: string };
  languages: readonly string[];
  geo: { latitude: number; longitude: number };
  schemaId: string;
}

export default function LocationCard({
  name,
  commissionerName,
  commissionerTitle,
  address,
  parking,
  nearbyNeighbourhoods,
  googleMapsEmbed,
  mapUrl,
  calendlyUrl,
  hours,
  languages,
  geo,
  schemaId,
}: LocationCardProps) {
  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': schemaId,
    name: `Calgary Oaths — ${name}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: address.split(',')[0],
      addressLocality: 'Calgary',
      addressRegion: 'AB',
      addressCountry: 'CA',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: geo.latitude,
      longitude: geo.longitude,
    },
    telephone: '+15876000746',
    email: 'info@calgaryoaths.com',
    openingHours: ['Mo-Fr 09:00-21:00', 'Sa 10:00-17:00'],
    priceRange: '$',
  };

  return (
    <>
      <SchemaSEO schema={localBusinessSchema} />
      <div className="card overflow-hidden">
        {/* Map */}
        <div className="h-64 -mx-6 -mt-6 mb-6">
          <iframe
            src={googleMapsEmbed}
            width="100%"
            height="256"
            style={{ border: 0 }}
            allowFullScreen={false}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={`Map of ${name}`}
          />
        </div>

        {/* Commissioner */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-14 h-14 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
            <span className="text-white font-display font-bold text-xl">
              {commissionerName.split(' ').map((n) => n[0]).join('')}
            </span>
          </div>
          <div>
            <p className="font-display font-semibold text-lg text-charcoal">{commissionerName}</p>
            <p className="text-sm text-mid-grey">{commissionerTitle}</p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-charcoal mb-5">
          <div className="flex items-start gap-2">
            <MapPin size={16} className="text-gold mt-0.5 flex-shrink-0" />
            <div>
              <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="hover:text-gold flex items-center gap-1 transition-colors">
                {address} <ExternalLink size={12} />
              </a>
              <p className="text-mid-grey text-xs mt-0.5">{parking}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-gold flex-shrink-0" />
            <p>By appointment only</p>
          </div>
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-gold flex-shrink-0" />
            <p>{languages.join(', ')}</p>
          </div>
        </div>

        {/* Nearby */}
        <div className="mb-5">
          <p className="text-xs font-medium uppercase tracking-wide text-mid-grey mb-2">Serving nearby</p>
          <div className="flex flex-wrap gap-1.5">
            {nearbyNeighbourhoods.map((n) => (
              <span key={n} className="text-xs bg-bg text-charcoal px-2 py-1 rounded-pill border border-border">
                {n}
              </span>
            ))}
          </div>
        </div>

        <BookButton
          label={`Book with ${commissionerName.split(' ')[0]} →`}
          variant="primary"
          className="w-full justify-center"
        />
      </div>
    </>
  );
}
