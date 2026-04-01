import Link from 'next/link';
import { MapPin, Clock, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { commissioners as fallbackCommissioners } from '@/lib/data/commissioners';

type LocationCommissioner = {
  id: string;
  name: string;
  title: string;
  location: string;
  location_slug: string;
  address: string;
  calendly_url: string;
  hours_weekdays: string;
  hours_saturday: string;
  hours_sunday: string;
  google_maps_embed: string;
  map_url: string;
};

async function getCommissioners(): Promise<LocationCommissioner[]> {
  const { data, error } = await supabase
    .from('co_commissioners')
    .select('id, name, title, location, location_slug, address, calendly_url, hours_weekdays, hours_saturday, hours_sunday, google_maps_embed, map_url')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error || !data?.length) {
    return fallbackCommissioners.map((c) => ({
      id: c.id,
      name: c.name,
      title: c.title,
      location: c.location,
      location_slug: c.locationSlug,
      address: c.address,
      calendly_url: c.calendlyUrl,
      hours_weekdays: c.hours.weekdays,
      hours_saturday: c.hours.saturday,
      hours_sunday: c.hours.sunday,
      google_maps_embed: c.googleMapsEmbed,
      map_url: c.mapUrl,
    }));
  }
  return data as LocationCommissioner[];
}

export default async function LocationsSection() {
  const commissioners = await getCommissioners();

  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-content">
        <div className="text-center mb-12">
          <h2 className="section-heading text-3xl md:text-4xl">Our Calgary locations</h2>
          <p className="text-mid-grey mt-3 max-w-xl mx-auto">
            Two convenient locations with extended evening hours. Walk-ins welcome.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {commissioners.map((c) => (
            <div key={c.id} className="card overflow-hidden">
              {/* Map embed */}
              <div className="h-48 -mx-6 -mt-6 mb-6 overflow-hidden">
                <iframe
                  src={c.google_maps_embed}
                  width="100%"
                  height="192"
                  style={{ border: 0 }}
                  allowFullScreen={false}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`Map of ${c.location}`}
                />
              </div>

              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-display font-bold text-sm">
                    {c.name.split(' ').map((n: string) => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <p className="font-display font-semibold text-charcoal">{c.name}</p>
                  <p className="text-xs text-mid-grey">{c.title}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm text-mid-grey mb-5">
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-gold mt-0.5 flex-shrink-0" />
                  <a
                    href={c.map_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-gold transition-colors flex items-center gap-1"
                  >
                    {c.address}
                    <ExternalLink size={11} />
                  </a>
                </div>
                <div className="flex items-start gap-2">
                  <Clock size={14} className="text-gold mt-0.5 flex-shrink-0" />
                  <div>
                    <p>Mon–Fri: {c.hours_weekdays}</p>
                    <p>Sat: {c.hours_saturday} · Sun: {c.hours_sunday}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <a
                  href={c.calendly_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary flex-1 justify-center text-xs py-2.5"
                >
                  Book with {c.name.split(' ')[0]}
                </a>
                <Link
                  href={`/locations/${c.location_slug}`}
                  className="btn-secondary flex-1 justify-center text-xs py-2.5"
                >
                  View details
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
