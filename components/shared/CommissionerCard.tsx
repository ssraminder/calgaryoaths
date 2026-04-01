import Link from 'next/link';
import { MapPin, Clock, Globe, Award } from 'lucide-react';
import { Commissioner } from '@/lib/data/commissioners';

interface CommissionerCardProps {
  commissioner: Commissioner;
  size?: 'full' | 'compact';
}

export default function CommissionerCard({ commissioner: c, size = 'full' }: CommissionerCardProps) {
  if (size === 'compact') {
    return (
      <div className="card flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
            <span className="text-white font-display font-bold text-lg">
              {c.name.split(' ').map((n) => n[0]).join('')}
            </span>
          </div>
          <div>
            <p className="font-display font-semibold text-charcoal">{c.name}</p>
            <p className="text-xs text-mid-grey">{c.location}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {c.credentials.map((cred) => (
            <span key={cred} className="text-xs bg-gold/10 text-gold px-2 py-0.5 rounded-pill font-medium">
              {cred}
            </span>
          ))}
        </div>
        <a
          href={c.calendlyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary text-xs justify-center w-full"
        >
          Book with {c.name.split(' ')[0]} →
        </a>
      </div>
    );
  }

  // Full size
  return (
    <div className="card flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
          <span className="text-white font-display font-bold text-2xl">
            {c.name.split(' ').map((n) => n[0]).join('')}
          </span>
        </div>
        <div className="flex-1">
          <h3 className="font-display font-semibold text-xl text-charcoal">{c.name}</h3>
          <p className="text-mid-grey text-sm mt-0.5">{c.title}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {c.credentials.map((cred) => (
              <span key={cred} className="text-xs bg-gold/10 text-gold px-2 py-0.5 rounded-pill font-medium">
                {cred}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bio */}
      <p className="text-mid-grey text-sm leading-relaxed">{c.bio}</p>

      {/* Details */}
      <div className="space-y-3 text-sm">
        <div className="flex items-start gap-3">
          <MapPin size={16} className="text-gold mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-charcoal">{c.location}</p>
            <p className="text-mid-grey">{c.address}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Clock size={16} className="text-gold flex-shrink-0" />
          <p className="text-charcoal">By appointment only</p>
        </div>
        <div className="flex items-center gap-3">
          <Globe size={16} className="text-gold flex-shrink-0" />
          <p className="text-charcoal">{c.languages.join(', ')}</p>
        </div>
        <div className="flex items-start gap-3">
          <Award size={16} className="text-gold mt-0.5 flex-shrink-0" />
          <div>
            {c.credentials.map((cred) => (
              <p key={cred} className="text-charcoal">{cred}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Nearby neighbourhoods */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-mid-grey mb-2">Nearby areas</p>
        <div className="flex flex-wrap gap-1.5">
          {c.nearbyNeighbourhoods.map((n) => (
            <span key={n} className="text-xs bg-bg text-charcoal px-2 py-1 rounded-pill border border-border">
              {n}
            </span>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-border">
        <a
          href={c.calendlyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary flex-1 justify-center"
        >
          Book with {c.name.split(' ')[0]} →
        </a>
        <Link
          href={`/locations/${c.locationSlug}`}
          className="btn-secondary flex-1 justify-center"
        >
          View location
        </Link>
      </div>
    </div>
  );
}
