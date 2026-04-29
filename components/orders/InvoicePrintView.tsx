'use client';

import { useEffect } from 'react';
import { formatCents, lineTotalCents } from '@/lib/orders/pricing';
import type { Order, OrderItem } from '@/lib/orders/types';

interface Props {
  order: Order;
  items: OrderItem[];
  autoPrint?: boolean;
}

export default function InvoicePrintView({ order, items, autoPrint }: Props) {
  useEffect(() => {
    if (autoPrint) {
      const t = setTimeout(() => window.print(), 350);
      return () => clearTimeout(t);
    }
  }, [autoPrint]);

  const isApostille = order.order_type === 'apostille';
  const fullAddress = [order.customer_address_unit, order.customer_address_street, order.customer_address_city, order.customer_address_province, order.customer_address_postal, order.customer_address_country].filter(Boolean).join(', ');
  const travelFee = order.travel_fee_cents || 0;

  return (
    <div className="invoice-page mx-auto bg-white text-gray-900 print:p-0">
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .invoice-page { padding: 0 !important; max-width: none !important; }
        }
      `}</style>

      <div className="no-print mb-4 flex items-center justify-between">
        <a href="javascript:history.back()" className="text-sm text-gray-500 underline">&larr; Back</a>
        <button onClick={() => window.print()} className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white">Print</button>
      </div>

      <div className="max-w-3xl space-y-6 p-8 print:p-8">
        <header className="flex items-start justify-between border-b border-gray-300 pb-4">
          <div>
            <h1 className="text-2xl font-semibold">Calgary Oaths</h1>
            <p className="text-sm text-gray-600">Commissioner of Oaths · Notary Public · Apostille</p>
            <p className="text-xs text-gray-500 mt-1">(587) 600-0746 · info@calgaryoaths.com</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-semibold">INVOICE</h2>
            <p className="text-sm text-gray-700">{order.invoice_number || order.order_number}</p>
            <p className="text-xs text-gray-500">{new Date(order.invoice_generated_at || order.created_at).toLocaleDateString()}</p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-1">Bill to</h3>
            <p className="font-medium">{order.customer_name || '—'}</p>
            <p className="text-gray-600">{order.customer_email}</p>
            <p className="text-gray-600">{order.customer_phone}</p>
            {fullAddress && <p className="text-gray-600 mt-1">{fullAddress}</p>}
          </div>
          <div>
            <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-1">Service</h3>
            <p className="font-medium">{isApostille ? 'Apostille / Authentication' : 'Notarization / Oath Commissioner'}</p>
            {isApostille && order.destination_country && <p className="text-gray-600">Destination: {order.destination_country}</p>}
            {!isApostille && order.service_role && (
              <p className="text-gray-600">{order.service_role === 'notary' ? 'Notary Public' : 'Commissioner of Oaths'}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">Order #: {order.order_number}</p>
            <p className="text-xs text-gray-500">Date: {new Date(order.order_date).toLocaleDateString()}</p>
          </div>
        </section>

        <section>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-300 text-left text-xs uppercase tracking-wider text-gray-500">
                <th className="py-2 pr-2">Description</th>
                <th className="py-2 px-2 text-right w-16">Qty</th>
                <th className="py-2 px-2 text-right w-24">Unit</th>
                {isApostille && <th className="py-2 px-2 text-right w-24">Gov fee</th>}
                <th className="py-2 pl-2 text-right w-24">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx} className="border-b border-gray-100 align-top">
                  <td className="py-2 pr-2">
                    <p>{it.description || it.item_type || 'Item'}</p>
                    {it.notes && <p className="text-xs text-gray-500">{it.notes}</p>}
                  </td>
                  <td className="py-2 px-2 text-right">{it.quantity}</td>
                  <td className="py-2 px-2 text-right">{formatCents(it.unit_price_cents)}</td>
                  {isApostille && <td className="py-2 px-2 text-right">{formatCents(it.gov_fee_cents || 0)}</td>}
                  <td className="py-2 pl-2 text-right">{formatCents(lineTotalCents(it))}</td>
                </tr>
              ))}
              {travelFee > 0 && (
                <tr className="border-b border-gray-100">
                  <td className="py-2 pr-2" colSpan={isApostille ? 4 : 3}>Travel fee</td>
                  <td className="py-2 pl-2 text-right">{formatCents(travelFee)}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={isApostille ? 4 : 3} className="pt-3 pr-2 text-right text-sm">Subtotal</td>
                <td className="pt-3 pl-2 text-right">{formatCents(order.subtotal_cents)}</td>
              </tr>
              <tr>
                <td colSpan={isApostille ? 4 : 3} className="pr-2 text-right text-sm">GST (5%)</td>
                <td className="pl-2 text-right">{formatCents(order.tax_cents)}</td>
              </tr>
              {(order.discount_cents || 0) > 0 && (
                <tr>
                  <td colSpan={isApostille ? 4 : 3} className="pr-2 text-right text-sm">Discount</td>
                  <td className="pl-2 text-right">-{formatCents(order.discount_cents || 0)}</td>
                </tr>
              )}
              <tr className="border-t-2 border-gray-300">
                <td colSpan={isApostille ? 4 : 3} className="pt-2 pr-2 text-right font-semibold">Total</td>
                <td className="pt-2 pl-2 text-right font-semibold">{formatCents(order.total_cents)}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        {order.payment_method && (
          <section className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm">
            <p>
              <strong>Paid in full</strong> — {order.payment_method.replace('_', ' ')}
              {order.payment_reference ? ` (ref: ${order.payment_reference})` : ''}
              {order.paid_at ? ` on ${new Date(order.paid_at).toLocaleString()}` : ''}.
            </p>
          </section>
        )}

        {order.signature_url && (
          <section className="border-t border-gray-200 pt-4">
            <p className="text-xs text-gray-500 mb-1">Customer signature ({order.signed_at ? new Date(order.signed_at).toLocaleString() : ''})</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={order.signature_url} alt="Customer signature" className="h-20" />
            <p className="text-xs text-gray-400 mt-1">
              Customer accepted terms and conditions on {order.terms_accepted_at ? new Date(order.terms_accepted_at).toLocaleString() : '—'}.
            </p>
          </section>
        )}

        <footer className="border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
          Thank you for your business · calgaryoaths.com
        </footer>
      </div>
    </div>
  );
}
