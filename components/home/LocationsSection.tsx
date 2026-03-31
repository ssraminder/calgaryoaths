import Link from 'next/link';
import { MapPin, Clock, ExternalLink } from 'lucide-react';
import { commissioners } from '@/lib/data/commissioners';

export default function LocationsSection() {
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
                  src={c.googleMapsEmbed}
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
                    {c.name.split(' ').map((n) => n[0]).join('')}
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
                    href={c.mapUrl}
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
                    <p>Mon–Fri: {c.hours.weekdays}</p>
                    <p>Sat: {c.hours.saturday} · Sun: {c.hours.sunday}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <a
                  href={c.calendlyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary flex-1 justify-center text-xs py-2.5"
                >
                  Book with {c.name.split(' ')[0]}
                </a>
                <Link
                  href={`/locations/${c.locationSlug}`}
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
