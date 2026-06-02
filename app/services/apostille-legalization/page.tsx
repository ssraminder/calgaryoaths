import type { Metadata } from 'next';
import ServicePageLayout from '@/components/shared/ServicePageLayout';
import { services } from '@/lib/data/services';

const service = services.find((s) => s.slug === 'apostille-legalization')!;

export const metadata: Metadata = {
  title: 'Apostille & Document Legalization Calgary | From $159 | Calgary Oaths',
  description:
    'Apostille and document legalization in Calgary from $159 for the first document, $50 per additional document. Hague Convention authentication and consular legalization. Notary Public service in-house.',
  alternates: { canonical: 'https://calgaryoaths.com/services/apostille-legalization' },
  openGraph: { title: 'Apostille & Legalization Calgary | From $159 | Calgary Oaths', url: 'https://calgaryoaths.com/services/apostille-legalization' },
};

export default function ApostilleLegalizationPage() {
  return (
    <ServicePageLayout
      service={service}
      intro="Apostille starts at $159 for the first document when you drop off and pick up at our Calgary office, plus $50 per additional document on the same order. Door-to-door courier within Alberta is available at $200 for the first document. Since January 2024, Canada is a member of the Hague Apostille Convention, allowing Canadian documents to be authenticated for use in 120+ countries. We review your documents, provide Notary Public certification where required, and coordinate with Global Affairs Canada or the correct provincial Competent Authority. For countries outside the Hague Convention, we guide you through the consular legalization process."
    />
  );
}
