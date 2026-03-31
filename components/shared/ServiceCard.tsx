import Link from 'next/link';
import { FileText, Stamp, Plane, Mail, Globe, Car, ArrowRight, CheckCircle } from 'lucide-react';
import { Service } from '@/lib/data/services';

const iconMap: Record<string, React.ElementType> = {
  FileText,
  Stamp,
  Plane,
  Mail,
  Globe,
  Car,
};

interface ServiceCardProps {
  service: Service;
  variant?: 'card' | 'block';
}

export default function ServiceCard({ service, variant = 'card' }: ServiceCardProps) {
  const Icon = iconMap[service.icon] || FileText;

  if (variant === 'block') {
    return (
      <div className="card">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-btn bg-gold/10 flex items-center justify-center flex-shrink-0">
            <Icon size={22} className="text-gold" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-xl text-charcoal">{service.name}</h2>
            <p className="text-mid-grey text-sm mt-1">{service.shortDescription}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-mid-grey mb-2">What's included</p>
            <ul className="space-y-1">
              {service.what.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-charcoal">
                  <CheckCircle size={14} className="text-teal mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-mid-grey mb-2">What to bring</p>
            <ul className="space-y-1">
              {service.bring.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-charcoal">
                  <ArrowRight size={14} className="text-navy mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div>
            <span className="text-xl font-display font-bold text-gold">{service.priceFrom}</span>
            <span className="text-sm text-mid-grey ml-2">{service.priceNote}</span>
          </div>
          <div className="flex gap-3">
            <Link href={`/services/${service.slug}`} className="btn-ghost text-sm">
              Learn more <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card hover:shadow-card-hover transition-shadow duration-200 flex flex-col">
      <div className="w-10 h-10 rounded-btn bg-gold/10 flex items-center justify-center mb-4">
        <Icon size={20} className="text-gold" />
      </div>
      <h3 className="font-display font-semibold text-lg text-charcoal mb-2">{service.name}</h3>
      <p className="text-mid-grey text-sm leading-relaxed flex-1 mb-4">{service.shortDescription}</p>
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <span className="text-sm font-medium text-charcoal">
          From <span className="text-gold font-semibold">{service.priceFrom}</span>
        </span>
        <Link href={`/services/${service.slug}`} className="text-sm text-gold hover:text-gold-light font-medium flex items-center gap-1 transition-colors">
          Learn more <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
