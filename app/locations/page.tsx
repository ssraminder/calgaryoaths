import type { Metadata } from 'next';
import Link from 'next/link';
import { MapPin, Clock, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { commissioners as fallbackCommissioners } from '@/lib/data/commissioners';
import BookButton from '@/components/shared/BookButton';

export const metadata: Metadata = {
  title: 'Commissioner of Oaths Calgary Locations | Downtown & NE | Calgary Oaths',
  description:
    'Two Commissioner of Oaths locations in Calgary — Downtown (7th Ave SW) and NE Calgary. By appointment. Plus mobile service across Calgary.',
  alternates: { canonical: 'https://calgaryoaths.com/locations' },
  openGraph: { title: 'Calgary Oaths Locations | Calgary Oaths', url: 'https://calgaryoaths.com/locations' },
};

type LocationCommissioner = {
  id: string;
  name: string;
  title: string;
  location: string;
  location_slug: string;
  address: string;
  calendly_url: string;
  google_maps_embed: string;
  map_url: string;
};

async function getCommissioners() {
  const { data, error } = await supabase
    .from('co_commissioners')
    .select('id, name, title, location, location_slug, address, calendly_url, google_maps_embed, map_url')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error || !data?.length) {
    // Fall back to hardcoded data if Supabase is unreachable
    return fallbackCommissioners.map((c) => ({
      id: c.id,
      name: c.name,
      title: c.title,
      location: c.location,
      location_slug: c.locationSlug,
      address: c.address,
      calendly_url: c.calendlyUrl,
      google_maps_embed: c.googleMapsEmbed,
      map_url: c.mapUrl,
    }));
  }
  return data as LocationCommissioner[];
}

export default async function LocationsPage() {
  const commissioners = await getCommissioners();

  return (
    <div className="py-12 lg:py-20">
      <div className="max-content">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-display font-bold text-4xl md:text-5xl text-navy mb-4">Our Calgary Locations</h1>
          <p className="text-mid-grey text-lg max-w-xl mx-auto">
            Two commissioners, two locations. Walk-ins welcome. Extended evening hours Monday through Friday.
          </p>
        </div>

        {/* Location cards stacked */}
        <div className="space-y-6 mb-16">
          {commissioners.map((c) => (
            <div key={c.id} className="card">
              {/* Map embed */}
              <div className="h-56 -mx-6 -mt-6 mb-6 overflow-hidden rounded-t-card">
                <iframe
                  src={c.google_maps_embed}
                  width="100%"
                  height="224"
                  style={{ border: 0 }}
                  allowFullScreen={false}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`Map of ${c.location}`}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-display font-bold">
                        {c.name.split(' ').map((n: string) => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="font-display font-semibold text-charcoal">{c.name}</p>
                      <p className="text-sm text-mid-grey">{c.title}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-charcoal">
                    <div className="flex items-start gap-2">
                      <MapPin size={15} className="text-gold mt-0.5 flex-shrink-0" />
                      <a href={c.map_url} target="_blank" rel="noopener noreferrer" className="hover:text-gold flex items-center gap-1">
                        {c.address} <ExternalLink size={11} />
                      </a>
                    </div>
                    <div className="flex items-start gap-2">
                      <Clock size={15} className="text-gold mt-0.5 flex-shrink-0" />
                      <p>By appointment only</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 justify-end">
                  <a href={c.calendly_url} target="_blank" rel="noopener noreferrer" className="btn-primary justify-center">
                    Book with {c.name.split(' ')[0]}
                  </a>
                  <Link href={`/locations/${c.location_slug}`} className="btn-secondary justify-center">
                    View location details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile service section */}
        <div className="bg-navy rounded-card p-8 md:p-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="font-display font-bold text-2xl md:text-3xl text-white mb-3">
                {"Can't come to us?"}
                <br />
                <span className="text-gold">We come to you.</span>
              </h2>
              <p className="text-white/70 leading-relaxed">
                Our mobile commissioning service covers all Calgary neighbourhoods, plus Airdrie, Cochrane,
                and Chestermere by request. Home, office, hospital, care facility — we bring the commissioner to you.
              </p>
              <div className="mt-4 space-y-1 text-sm text-white/60">
                <p>Travel fee: +$30–$50 depending on location</p>
                <p>All standard services available on-site</p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Link href="/services/mobile-service" className="btn-primary justify-center">
                Learn about mobile service
              </Link>
              <a href="tel:5876000746" className="inline-flex items-center justify-center px-6 py-3 rounded-btn border-2 border-white/40 text-white text-sm font-medium hover:bg-white/10 transition-colors uppercase tracking-wide">
                Call (587) 600-0746
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
