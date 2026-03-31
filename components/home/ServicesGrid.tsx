import Link from 'next/link';
import { FileText, Stamp, Plane, Mail, Globe, Car, ArrowRight } from 'lucide-react';
import { services } from '@/lib/data/services';

const iconMap: Record<string, React.ElementType> = {
  FileText,
  Stamp,
  Plane,
  Mail,
  Globe,
  Car,
};

export default function ServicesGrid() {
  return (
    <section className="py-16 lg:py-24 bg-bg">
      <div className="max-content">
        <div className="text-center mb-12">
          <h2 className="section-heading text-3xl md:text-4xl">Documents we commission for you</h2>
          <p className="text-mid-grey mt-3 max-w-xl mx-auto">
            We draft, print, and commission — bring your ID and we handle the rest.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => {
            const Icon = iconMap[service.icon] || FileText;
            return (
              <div
                key={service.slug}
                className="card hover:shadow-card-hover transition-shadow duration-200 flex flex-col"
              >
                <div className="w-10 h-10 rounded-btn bg-gold/10 flex items-center justify-center mb-4">
                  <Icon size={20} className="text-gold" />
                </div>
                <h3 className="font-display font-semibold text-lg text-charcoal mb-2">
                  {service.name}
                </h3>
                <p className="text-mid-grey text-sm leading-relaxed flex-1 mb-4">
                  {service.shortDescription}
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <span className="text-sm font-medium text-charcoal">
                    From <span className="text-gold font-semibold">{service.priceFrom}</span>
                  </span>
                  <Link
                    href={`/services/${service.slug}`}
                    className="text-sm text-gold hover:text-gold-light font-medium flex items-center gap-1 transition-colors"
                  >
                    Learn more <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
