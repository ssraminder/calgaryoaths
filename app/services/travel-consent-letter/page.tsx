import type { Metadata } from 'next';
import ServicePageLayout from '@/components/shared/ServicePageLayout';
import { services } from '@/lib/data/services';

const service = services.find((s) => s.slug === 'travel-consent-letter')!;

export const metadata: Metadata = {
  title: 'Travel Consent Letter Calgary | Child Travel Permission | Calgary Oaths',
  description:
    'Travel consent letters for children travelling without one or both parents. Drafted to CBSA and airline standards. Drafting from $120/hr (commissioning included). Same-day available.',
  alternates: { canonical: 'https://calgaryoaths.com/services/travel-consent-letter' },
  openGraph: { title: 'Travel Consent Letter Calgary | Calgary Oaths', url: 'https://calgaryoaths.com/services/travel-consent-letter' },
};

export default function TravelConsentLetterPage() {
  return (
    <ServicePageLayout
      service={service}
      intro="A travel consent letter is a commissioned document confirming that a child has permission from their parent(s) or legal guardian(s) to travel internationally — either with one parent, with other adults, or as part of a school or supervised group. We commission the letter with our official seal. Drafting to CBSA and airline standards starts at $120/hr (commissioning included), billed every 30 minutes after the first hour."
    />
  );
}
