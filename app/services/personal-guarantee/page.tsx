import type { Metadata } from 'next';
import ServicePageLayout from '@/components/shared/ServicePageLayout';
import { services } from '@/lib/data/services';

const service = services.find((s) => s.slug === 'personal-guarantee')!;

export const metadata: Metadata = {
  title: 'Personal Guarantee Notarization Calgary | Calgary Oaths',
  description:
    'Notarized personal guarantees in Calgary for commercial leases, business loans, and financing agreements. Drafting available. Same-day service. From $50.',
  keywords: [
    'personal guarantee notarization calgary',
    'personal guarantee notary calgary',
    'notarized personal guarantee',
    'commercial lease guarantee calgary',
    'business loan guarantee notary',
    'personal guarantee witnessing',
  ],
  alternates: { canonical: 'https://calgaryoaths.com/services/personal-guarantee' },
  openGraph: {
    title: 'Personal Guarantee Notarization Calgary | Calgary Oaths',
    url: 'https://calgaryoaths.com/services/personal-guarantee',
  },
};

export default function PersonalGuaranteePage() {
  return (
    <ServicePageLayout
      service={service}
      intro="A personal guarantee is a legal commitment where you agree to be personally responsible for a debt or obligation. Lenders, landlords, and financing companies commonly require notarized personal guarantees. We witness signatures, notarize, and can draft the guarantee from scratch."
    />
  );
}
