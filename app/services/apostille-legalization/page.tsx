import type { Metadata } from 'next';
import ServicePageLayout from '@/components/shared/ServicePageLayout';
import { services } from '@/lib/data/services';

const service = services.find((s) => s.slug === 'apostille-legalization')!;

export const metadata: Metadata = {
  title: 'Apostille & Document Legalization Calgary | Calgary Oaths',
  description:
    'Authentication of Canadian documents for international use. Apostille (Hague Convention) and consular legalization. Notary Public service. Contact us for a quote.',
  alternates: { canonical: 'https://calgaryoaths.com/services/apostille-legalization' },
  openGraph: { title: 'Apostille & Legalization Calgary | Calgary Oaths', url: 'https://calgaryoaths.com/services/apostille-legalization' },
};

export default function ApostilleLegalizationPage() {
  return (
    <ServicePageLayout
      service={service}
      intro="Since January 2024, Canada is a member of the Hague Apostille Convention, allowing Canadian documents to be authenticated via apostille for use in 120+ countries. We review your documents, provide Notary Public certification where required, and coordinate with Global Affairs Canada for the apostille. For countries outside the Hague Convention, we guide you through the legalization process."
    />
  );
}
