import BookButton from '@/components/shared/BookButton';

const pricingRows = [
  {
    service: 'Document commissioning (you bring it)',
    price: '$30',
    includes: 'Witnessing, seal, signature',
  },
  {
    service: 'Affidavit drafting + commissioning',
    price: '$40',
    includes: 'Drafting, printing, commissioning',
  },
  {
    service: 'Statutory declaration',
    price: '$35',
    includes: 'Drafting or commissioning',
  },
  {
    service: 'Travel consent letter',
    price: '$40',
    includes: 'Drafting, printing, commissioning',
  },
  {
    service: 'Invitation letter (IRCC)',
    price: '$45',
    includes: 'Drafting, printing, commissioning',
  },
  {
    service: 'Certified true copies',
    price: '$15 each',
    includes: 'Certified copy with seal',
  },
  {
    service: 'Mobile service (travel fee)',
    price: '+$30–$50',
    includes: 'Added to standard service rate',
  },
  {
    service: 'Apostille / legalization',
    price: 'Contact for quote',
    includes: 'Depends on documents',
  },
];

export default function PricingTable() {
  return (
    <div className="space-y-6">
      {/* Table */}
      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy text-white">
              <th className="text-left p-4 font-body font-medium">Service</th>
              <th className="text-left p-4 font-body font-medium">Price</th>
              <th className="text-left p-4 font-body font-medium hidden sm:table-cell">Includes</th>
            </tr>
          </thead>
          <tbody>
            {pricingRows.map((row, i) => (
              <tr key={i} className={`border-t border-border ${i % 2 === 0 ? 'bg-white' : 'bg-bg'}`}>
                <td className="p-4 text-charcoal font-medium">{row.service}</td>
                <td className="p-4 text-gold font-display font-semibold whitespace-nowrap">{row.price}</td>
                <td className="p-4 text-mid-grey hidden sm:table-cell">{row.includes}</td>
              </tr>
            ))}
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
              <strong className="text-charcoal">Multi-document discount:</strong> Book 3+ documents in one appointment and receive 10% off the total.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gold font-bold mt-0.5">✓</span>
            <span>
              <strong className="text-charcoal">Payment:</strong> Cash · Credit/Debit · Interac e-Transfer accepted.
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
