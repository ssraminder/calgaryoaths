'use client';

import { useEffect } from 'react';
import type { Order } from '@/lib/orders/types';

interface TermsRecord {
  id: string;
  form_type: string;
  version: string;
  content_md: string;
  effective_from?: string | null;
}

interface Props {
  order: Order;
  terms: TermsRecord;
  autoPrint?: boolean;
}

function renderMarkdown(md: string) {
  const lines = md.split('\n');
  const out: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { out.push(''); continue; }
    if (line.startsWith('# ')) { out.push(`<h2 class="text-base font-semibold text-gray-900 mt-4 mb-2">${line.slice(2)}</h2>`); continue; }
    let html = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    if (/^\d+\.\s/.test(html)) html = `<p class="mb-2 leading-relaxed">${html}</p>`;
    else html = `<p class="mb-2 leading-relaxed">${html}</p>`;
    out.push(html);
  }
  return out.join('');
}

export default function SignedTermsPrintView({ order, terms, autoPrint }: Props) {
  useEffect(() => {
    if (autoPrint) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [autoPrint]);

  const serviceLabel = order.order_type === 'apostille'
    ? 'Apostille / Authentication'
    : 'Notarization / Oath Commissioner';
  const fullAddress = [
    order.customer_address_unit,
    order.customer_address_street,
    order.customer_address_city,
    order.customer_address_province,
    order.customer_address_postal,
    order.customer_address_country,
  ].filter(Boolean).join(', ');

  return (
    <div className="terms-page mx-auto bg-white text-gray-900 print:p-0">
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .terms-page { padding: 0 !important; max-width: none !important; }
        }
      `}</style>

      <div className="no-print mb-4 flex items-center justify-between">
        <a href="javascript:history.back()" className="text-sm text-gray-500 underline">&larr; Back</a>
        <button onClick={() => window.print()} className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white">Print / Save as PDF</button>
      </div>

      <div className="max-w-3xl space-y-6 p-8 print:p-8">
        <header className="flex items-start justify-between border-b border-gray-300 pb-4">
          <div>
            <h1 className="text-2xl font-semibold">Calgary Oaths</h1>
            <p className="text-sm text-gray-600">Commissioner of Oaths · Notary Public · Apostille</p>
            <p className="text-xs text-gray-500 mt-1">(587) 600-0746 · info@calgaryoaths.com</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-semibold">SIGNED TERMS</h2>
            <p className="text-sm text-gray-700">{order.order_number}</p>
            <p className="text-xs text-gray-500">Version {terms.version}</p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-1">Customer</h3>
            <p className="font-medium">{order.customer_name || '—'}</p>
            {order.customer_email && <p className="text-gray-600">{order.customer_email}</p>}
            {order.customer_phone && <p className="text-gray-600">{order.customer_phone}</p>}
            {fullAddress && <p className="text-gray-600 mt-1">{fullAddress}</p>}
          </div>
          <div>
            <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-1">Service</h3>
            <p className="font-medium">{serviceLabel}</p>
            <p className="text-xs text-gray-500 mt-1">Order #: {order.order_number}</p>
            <p className="text-xs text-gray-500">
              Date: {new Date(order.order_date || order.created_at).toLocaleDateString()}
            </p>
          </div>
        </section>

        <section className="rounded-md border border-gray-200 bg-white p-5 text-sm text-gray-800">
          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(terms.content_md) }} />
        </section>

        <section className="border-t border-gray-200 pt-4 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Customer acceptance</p>
          {order.signature_url ? (
            <div>
              <p className="text-xs text-gray-500 mb-1">
                Signature ({order.signed_at ? new Date(order.signed_at).toLocaleString() : '—'})
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={order.signature_url} alt="Customer signature" className="h-24" />
            </div>
          ) : (
            <p className="text-xs text-gray-500">No signature on file.</p>
          )}
          <div className="text-xs text-gray-600 space-y-0.5">
            <p>
              Customer accepted terms and conditions (v{terms.version}) on{' '}
              {order.terms_accepted_at ? new Date(order.terms_accepted_at).toLocaleString() : '—'}.
            </p>
            {order.signed_ip && <p>Signed from IP: {order.signed_ip}</p>}
            {order.signed_user_agent && <p className="break-words">User agent: {order.signed_user_agent}</p>}
          </div>
        </section>

        <footer className="border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
          Calgary Oaths · calgaryoaths.com
        </footer>
      </div>
    </div>
  );
}
