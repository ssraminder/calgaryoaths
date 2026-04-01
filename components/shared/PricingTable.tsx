import BookButton from '@/components/shared/BookButton';
import { supabase } from '@/lib/supabase';

type Service = {
  slug: string;
  name: string;
  short_description: string;
  price: number | null;
  price_label: string;
  is_in_house: boolean;
};

type VendorRate = {
  service_slug: string;
  first_page_cents: number;
};

async function getServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from('co_services')
    .select('slug, name, short_description, price, price_label, is_in_house')
    .eq('active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Failed to fetch services for pricing:', error.message);
    return [];
  }

  // Fetch lowest vendor rate per service to use as the "From $X" price
  const { data: rates } = await supabase
    .from('co_vendor_rates')
    .select('service_slug, first_page_cents');

  if (rates?.length) {
    const minRateMap = new Map<string, number>();
    for (const r of rates) {
      if (r.first_page_cents == null) continue;
      const current = minRateMap.get(r.service_slug);
      if (current == null || r.first_page_cents < current) {
        minRateMap.set(r.service_slug, r.first_page_cents);
      }
    }
    // Override co_services.price with the lowest vendor rate where available
    for (const svc of data ?? []) {
      const minRate = minRateMap.get(svc.slug);
      if (minRate != null) {
        svc.price = minRate;
      }
    }
  }

  return data ?? [];
}

async function getSettings(): Promise<{ convenienceFee: string; startingPrice: string }> {
  const { data } = await supabase
    .from('co_settings')
    .select('key, value')
    .in('key', ['convenience_fee_cents', 'starting_price']);

  const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  const feeCents = parseInt(map.convenience_fee_cents || '499', 10);
  return {
    convenienceFee: `$${(feeCents / 100).toFixed(2)}`,
    startingPrice: map.starting_price || '$30',
  };
}

export default async function PricingTable() {
  const [services, settings] = await Promise.all([getServices(), getSettings()]);

  // Separate mobile-related note
  const regularServices = services.filter((s) => s.slug !== 'mobile-service');

  return (
    <div className="space-y-6">
      {/* Table */}
      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy text-white">
              <th className="text-left p-4 font-body font-medium">Service</th>
              <th className="text-left p-4 font-body font-medium">Starting from</th>
              <th className="text-left p-4 font-body font-medium hidden sm:table-cell">Details</th>
            </tr>
          </thead>
          <tbody>
            {regularServices.map((svc, i) => (
              <tr key={svc.slug} className={`border-t border-border ${i % 2 === 0 ? 'bg-white' : 'bg-bg'}`}>
                <td className="p-4 text-charcoal font-medium">{svc.name}</td>
                <td className="p-4 text-gold font-display font-semibold whitespace-nowrap">
                  {svc.price != null ? `$${(svc.price / 100).toFixed(0)}` : svc.price_label}
                </td>
                <td className="p-4 text-mid-grey hidden sm:table-cell">{svc.short_description}</td>
              </tr>
            ))}
            {/* Mobile service */}
            <tr className={`border-t border-border ${regularServices.length % 2 === 0 ? 'bg-white' : 'bg-bg'}`}>
              <td className="p-4 text-charcoal font-medium">Mobile service (travel fee)</td>
              <td className="p-4 text-gold font-display font-semibold whitespace-nowrap">Varies</td>
              <td className="p-4 text-mid-grey hidden sm:table-cell">Travel fee added to service rate, charged upfront</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Notes */}
      <div className="bg-gold/5 border border-gold/20 rounded-card p-5 space-y-2 text-sm">
        <p className="font-medium text-charcoal">Good to know:</p>
        <ul className="space-y-1.5 text-mid-grey">
          <li className="flex items-start gap-2">
            <span className="text-gold font-bold mt-0.5">✓</span>
            <span>
              <strong className="text-charcoal">Booking fee:</strong> The first document rate is charged as a booking fee when you book online. Additional documents are charged at your appointment.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gold font-bold mt-0.5">✓</span>
            <span>
              <strong className="text-charcoal">Convenience fee:</strong> A {settings.convenienceFee} convenience fee applies to online bookings.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gold font-bold mt-0.5">✓</span>
            <span>
              <strong className="text-charcoal">Tax:</strong> All prices are subject to applicable taxes (GST 5% in Alberta).
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gold font-bold mt-0.5">✓</span>
            <span>
              <strong className="text-charcoal">Prices may vary by commissioner.</strong> Exact pricing is shown during the booking process based on your selected service and commissioner.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gold font-bold mt-0.5">✓</span>
            <span>
              <strong className="text-charcoal">Payment:</strong> Credit/Debit · Interac e-Transfer accepted online. Cash accepted at appointment.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gold font-bold mt-0.5">✓</span>
            <span>
              <strong className="text-charcoal">Government ID required</strong> for all services.
            </span>
          </li>
        </ul>
      </div>

      <div className="text-center">
        <BookButton label="Book Your Appointment" variant="primary" size="lg" />
      </div>
    </div>
  );
}
