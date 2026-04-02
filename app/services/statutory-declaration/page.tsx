import type { Metadata } from 'next';
import ServicePageLayout from '@/components/shared/ServicePageLayout';
import { services } from '@/lib/data/services';

const service = services.find((s) => s.slug === 'statutory-declaration')!;

export const metadata: Metadata = {
  title: 'Statutory Declarations Calgary | Same-Day Service | Calgary Oaths',
  description:
    'Statutory declarations commissioned in Calgary. Common-law, lost documents, insurance claims & more. Drafting from $120/hr (commissioning included). From $35. Same-day service.',
  alternates: { canonical: 'https://calgaryoaths.com/services/statutory-declaration' },
  openGraph: { title: 'Statutory Declarations Calgary | Calgary Oaths', url: 'https://calgaryoaths.com/services/statutory-declaration' },
};

export default function StatutoryDeclarationPage() {
  return (
    <ServicePageLayout
      service={service}
      intro="A statutory declaration is a written statement of facts you declare to be true before a Commissioner of Oaths. Unlike an affidavit, it doesn't require an oath — making it the right document for administrative and government purposes. We administer the affirmation and commission it with our official seal. Drafting starts at $120/hr (commissioning included), billed every 30 minutes after the first hour."
    />
  );
}
