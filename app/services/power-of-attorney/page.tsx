import type { Metadata } from 'next';
import ServicePageLayout from '@/components/shared/ServicePageLayout';
import { services } from '@/lib/data/services';

const service = services.find((s) => s.slug === 'power-of-attorney')!;

export const metadata: Metadata = {
  title: 'Power of Attorney Calgary | Draft, Notarize & Apostille | Calgary Oaths',
  description:
    'Full-service Power of Attorney in Calgary — we draft, notarize, and apostille your POA for use in any country. India property POA, GPA, SPA. All countries supported. From $80.',
  keywords: [
    'power of attorney calgary',
    'power of attorney for India calgary',
    'POA for India property calgary',
    'GPA SPA India calgary',
    'notarized power of attorney calgary',
    'apostille power of attorney canada',
    'power of attorney notary calgary',
    'POA for Pakistan calgary',
    'POA for Philippines calgary',
    'international power of attorney calgary',
    'Sub-Registrar power of attorney India',
  ],
  alternates: { canonical: 'https://calgaryoaths.com/services/power-of-attorney' },
  openGraph: {
    title: 'Power of Attorney Calgary — Draft, Notarize & Apostille | Calgary Oaths',
    url: 'https://calgaryoaths.com/services/power-of-attorney',
  },
};

export default function PowerOfAttorneyPage() {
  return (
    <ServicePageLayout
      service={service}
      intro="We handle your Power of Attorney from start to finish — drafting, notarization, and apostille, all in one place. Whether you need a POA for property transactions in India, managing assets in Pakistan, or legal proceedings in any country, we prepare documents that meet the specific requirements of your destination country, including Sub-Registrar and consular requirements."
    />
  );
}
