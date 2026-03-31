import type { Metadata } from 'next';
import PricingTable from '@/components/shared/PricingTable';

export const metadata: Metadata = {
  title: 'Commissioner of Oaths Pricing Calgary | Transparent Fees | Calgary Oaths',
  description:
    'Transparent pricing for Commissioner of Oaths services in Calgary. Commissioning from $30, affidavit drafting $40, travel consent letters $40. No hidden fees. Book today.',
  alternates: { canonical: 'https://calgaryoaths.com/pricing' },
  openGraph: { title: 'Commissioner Pricing Calgary | Calgary Oaths', url: 'https://calgaryoaths.com/pricing' },
};

export default function PricingPage() {
  return (
    <div className="py-12 lg:py-20">
      <div className="max-content max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="font-display font-bold text-4xl md:text-5xl text-navy mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-mid-grey text-lg">
            No hidden fees. No surprises. You&apos;ll know the full cost before you arrive.
          </p>
        </div>

        <PricingTable />
      </div>
    </div>
  );
}
