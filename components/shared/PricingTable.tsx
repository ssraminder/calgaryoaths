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
