import type { Metadata } from 'next';
import ServicePageLayout from '@/components/shared/ServicePageLayout';
import { services } from '@/lib/data/services';

const service = services.find((s) => s.slug === 'mobile-service')!;

export const metadata: Metadata = {
  title: 'Mobile Commissioner of Oaths Calgary | We Come to You | Calgary Oaths',
  description:
    'Mobile commissioning service across all Calgary neighbourhoods. We come to your home, office, hospital, or care facility. +$30–$50 travel fee. Call (587) 600-0746 to book.',
  alternates: { canonical: 'https://calgaryoaths.com/services/mobile-service' },
  openGraph: { title: 'Mobile Commissioner Calgary | Calgary Oaths', url: 'https://calgaryoaths.com/services/mobile-service' },
};

export default function MobileServicePage() {
  return (
    <ServicePageLayout
      service={service}
      intro="Can't make it to our Downtown or NE Calgary offices? We bring the commissioner to you. Our mobile commissioning service covers all Calgary neighbourhoods — whether you're at home, your workplace, a hospital, or a care facility. All standard commissioning services are available on-site. A travel fee of $30–$50 is added to the standard service rate."
    />
  );
}
