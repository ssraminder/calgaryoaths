import type { Metadata } from 'next';
import ServicePageLayout from '@/components/shared/ServicePageLayout';
import { services } from '@/lib/data/services';

const service = services.find((s) => s.slug === 'certified-translation')!;

export const metadata: Metadata = {
  title: 'Certified Translation Services Calgary | 130+ Languages | Calgary Oaths',
  description:
    'Certified document translation in Calgary for IRCC, IQAS, courts, and government use. 130+ languages including Punjabi, Hindi, Urdu, Arabic, Mandarin. Notarized translations available.',
  keywords: [
    'certified translation calgary',
    'IQAS translation calgary',
    'IRCC certified translation',
    'document translation calgary',
    'Punjabi translation calgary',
    'Hindi translation calgary',
    'notarized translation calgary',
    'immigration document translation',
    'birth certificate translation calgary',
    'translation for immigration canada',
  ],
  alternates: { canonical: 'https://calgaryoaths.com/services/certified-translation' },
  openGraph: {
    title: 'Certified Translation Services Calgary | Calgary Oaths',
    url: 'https://calgaryoaths.com/services/certified-translation',
  },
};

export default function CertifiedTranslationPage() {
  return (
    <ServicePageLayout
      service={service}
      intro="We provide certified document translations in over 130 languages — accepted by IRCC, IQAS, WES, courts, and government agencies across Canada. All translations include a certified translator declaration and can be notarized in the same appointment."
    />
  );
}
