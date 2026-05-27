import type { Metadata } from 'next';
import ServicePageLayout from '@/components/shared/ServicePageLayout';
import { services } from '@/lib/data/services';

const service = services.find((s) => s.slug === 'proof-of-life')!;

export const metadata: Metadata = {
  title: 'Proof of Life Declaration Calgary | Pension & Insurance | Calgary Oaths',
  description:
    'Commissioned proof of life declarations in Calgary for pension authorities, insurance companies, and government agencies. Mobile service available for homebound clients. From $35.',
  keywords: [
    'proof of life declaration calgary',
    'proof of life notary calgary',
    'pension proof of life canada',
    'proof of life certificate calgary',
    'CPP proof of life',
    'foreign pension proof of life calgary',
    'proof of existence declaration',
  ],
  alternates: { canonical: 'https://calgaryoaths.com/services/proof-of-life' },
  openGraph: {
    title: 'Proof of Life Declaration Calgary | Calgary Oaths',
    url: 'https://calgaryoaths.com/services/proof-of-life',
  },
};

export default function ProofOfLifePage() {
  return (
    <ServicePageLayout
      service={service}
      intro="A proof of life declaration is a commissioned document confirming that a specific person is alive as of a certain date. Commonly required by Canadian and foreign pension authorities, insurance companies, and government agencies. Mobile service available for homebound and elderly clients."
    />
  );
}
