import type { Metadata } from 'next';
import ServicePageLayout from '@/components/shared/ServicePageLayout';
import { services } from '@/lib/data/services';

const service = services.find((s) => s.slug === 'tr-to-pr-document-prep')!;

export const metadata: Metadata = {
  title: 'TR to PR 2026 Document Preparation Calgary | Calgary Oaths',
  description:
    'Complete document preparation for Canada\'s TR to PR 2026 pathway. Certified translations, affidavits, Letters of Explanation, police clearance support — all notarized and IRCC-ready.',
  keywords: [
    'TR to PR 2026',
    'TR to PR document preparation',
    'temporary resident to permanent resident canada',
    'TR to PR documents calgary',
    'immigration document preparation calgary',
    'IRCC document preparation',
    'TR to PR 2026 checklist',
    'post graduation work permit to PR',
  ],
  alternates: { canonical: 'https://calgaryoaths.com/services/tr-to-pr-document-prep' },
  openGraph: {
    title: 'TR to PR 2026 Document Preparation | Calgary Oaths',
    url: 'https://calgaryoaths.com/services/tr-to-pr-document-prep',
  },
};

export default function TrToPrDocumentPrepPage() {
  return (
    <ServicePageLayout
      service={service}
      intro="The TR to PR 2026 portal will fill fast — having your documents fully prepared before launch day is essential. We handle everything: certified translations, Letters of Explanation, affidavits, name consistency documents, and notarization. One stop, fully IRCC-ready."
    />
  );
}
