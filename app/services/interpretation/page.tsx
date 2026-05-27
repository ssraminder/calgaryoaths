import type { Metadata } from 'next';
import ServicePageLayout from '@/components/shared/ServicePageLayout';
import { services } from '@/lib/data/services';

const service = services.find((s) => s.slug === 'interpretation')!;

export const metadata: Metadata = {
  title: 'Interpretation Services Calgary | 130+ Languages | Calgary Oaths',
  description:
    'Professional interpretation services in Calgary for courts, immigration hearings, medical appointments, and business meetings. 130+ languages. In-person and remote available.',
  keywords: [
    'interpretation services calgary',
    'court interpreter calgary',
    'immigration interpreter calgary',
    'Punjabi interpreter calgary',
    'Hindi interpreter calgary',
    'medical interpreter calgary',
    'legal interpreter calgary',
    'phone interpretation services',
    'remote interpreter canada',
  ],
  alternates: { canonical: 'https://calgaryoaths.com/services/interpretation' },
  openGraph: {
    title: 'Interpretation Services Calgary | Calgary Oaths',
    url: 'https://calgaryoaths.com/services/interpretation',
  },
};

export default function InterpretationPage() {
  return (
    <ServicePageLayout
      service={service}
      intro="We provide professional interpretation in over 130 languages for legal, immigration, medical, and business settings. Our qualified interpreters are available in-person across Calgary or remotely via phone and video conference. Court-qualified interpreters available for legal proceedings."
    />
  );
}
