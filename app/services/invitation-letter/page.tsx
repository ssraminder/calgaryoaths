import type { Metadata } from 'next';
import ServicePageLayout from '@/components/shared/ServicePageLayout';
import { services } from '@/lib/data/services';

const service = services.find((s) => s.slug === 'invitation-letter')!;

export const metadata: Metadata = {
  title: 'Invitation Letter IRCC Calgary | Visitor Visa Support | Calgary Oaths',
  description:
    'Commissioned invitation letters for Canadian visitor visa applications. Drafted to IRCC requirements. Drafting from $120/hr (commissioning included). Super visa, TRV support. Same-day available in Calgary.',
  alternates: { canonical: 'https://calgaryoaths.com/services/invitation-letter' },
  openGraph: { title: 'Invitation Letter Calgary | Calgary Oaths', url: 'https://calgaryoaths.com/services/invitation-letter' },
};

export default function InvitationLetterPage() {
  return (
    <ServicePageLayout
      service={service}
      intro="An invitation letter is a commissioned document from a Canadian resident inviting a foreign national to visit Canada. A commissioned letter carries more weight in visa applications and is often specifically requested by consulates. We commission the letter with our official seal. Drafting to IRCC formatting requirements starts at $120/hr (commissioning included), billed every 30 minutes after the first hour."
    />
  );
}
