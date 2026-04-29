'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Smartphone, Tablet, Receipt, Printer, Check, AlertCircle, RefreshCw } from 'lucide-react';
import LineItemsEditor from './LineItemsEditor';
import ApostilleServiceFields, { apostileInitialFromOrder } from './ApostilleServiceFields';
import NotarizationServiceFields, { notarizationInitialFromOrder } from './NotarizationServiceFields';
import IdPhotosSection from './IdPhotosSection';
import PaymentSection from './PaymentSection';
import HandoffModal from './HandoffModal';
import OrderRealtime from './OrderRealtime';
import { computeTotals, formatCents } from '@/lib/orders/pricing';
import type { Order, OrderItem, OrderIdPhoto, PaymentMethod } from '@/lib/orders/types';

interface Props {
  order: Order;
  items: OrderItem[];
  idPhotos: OrderIdPhoto[];
  /** Where invoice/print page lives (staff portal-aware) */
  basePath: '/vendor/orders' | '/admin/orders' | '/tablet/orders';
}

const STATUS_LABELS: Record<Order['status'], { label: string; tone: string }> = {
  draft: { label: 'Draft', tone: 'bg-gray-100 text-gray-700' },
  awaiting_customer: { label: 'Awaiting customer', tone: 'bg-amber-100 text-amber-800' },
  customer_completed: { label: 'Customer completed', tone: 'bg-blue-100 text-blue-800' },
  awaiting_payment: { label: 'Awaiting payment', tone: 'bg-amber-100 text-amber-800' },
  paid: { label: 'Paid', tone: 'bg-green-100 text-green-800' },
  completed: { label: 'Completed', tone: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', tone: 'bg-red-100 text-red-800' },
};

export default function OrderWizard({ order: initialOrder, items: initialItems, idPhotos: initialPhotos, basePath }: Props) {
  const router = useRouter();
  const [order, setOrder] = useState<Order>(initialOrder);
  const [items, setItems] = useState<OrderItem[]>(initialItems);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [handoffOpen, setHandoffOpen] = useState(false);

  // Service field state (controlled)
  const [apostilleFields, setApostilleFields] = useState(() => apostileInitialFromOrder(order));
  const [notarizationFields, setNotarizationFields] = useState(() => notarizationInitialFromOrder(order));

  const totals = useMemo(() => {
    const travelFee = order.order_type === 'notarization' && notarizationFields.delivery_mode === 'mobile'
      ? notarizationFields.travel_fee_cents
      : 0;
    return computeTotals({
      items,
      travelFeeCents: travelFee,
      discountCents: order.discount_cents ?? 0,
    });
  }, [items, notarizationFields.delivery_mode, notarizationFields.travel_fee_cents, order.discount_cents, order.order_type]);

  const reload = useCallback(async () => {
    const res = await fetch(`/api/orders/${order.id}`);
    if (res.ok) {
      const data = await res.json();
      setOrder(data.order);
      setItems(data.items || []);
      if (data.order.order_type === 'apostille') setApostilleFields(apostileInitialFromOrder(data.order));
      else setNotarizationFields(notarizationInitialFromOrder(data.order));
    }
  }, [order.id]);

  async function saveDraft(opts?: { advanceTo?: Order['status'] }) {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        items: items.map((it, idx) => ({
          position: idx,
          item_type: it.item_type,
          description: it.description || it.item_type || 'Item',
          quantity: it.quantity,
          unit_price_cents: it.unit_price_cents,
          gov_fee_cents: it.gov_fee_cents ?? 0,
          notes: it.notes,
        })),
      };
      if (order.order_type === 'apostille') {
        Object.assign(payload, {
          destination_country: apostilleFields.destination_country || null,
          authentication_type: apostilleFields.authentication_type || null,
          notarization_required: apostilleFields.notarization_required,
          translation_required: apostilleFields.translation_required,
          translation_language: apostilleFields.translation_language || null,
          delivery_method: apostilleFields.delivery_method || null,
          expedited: apostilleFields.expedited,
          estimated_turnaround_days: apostilleFields.estimated_turnaround_days === '' ? null : apostilleFields.estimated_turnaround_days,
          notes_internal: apostilleFields.notes_internal || null,
        });
      } else {
        Object.assign(payload, {
          service_role: notarizationFields.service_role || null,
          performed_by_commissioner_id: notarizationFields.performed_by_commissioner_id || null,
          service_subtypes: notarizationFields.service_subtypes,
          delivery_mode: notarizationFields.delivery_mode || null,
          mobile_address: notarizationFields.mobile_address || null,
          travel_fee_cents: notarizationFields.travel_fee_cents,
          expedited: notarizationFields.expedited,
          estimated_turnaround_days: notarizationFields.estimated_turnaround_days === '' ? null : notarizationFields.estimated_turnaround_days,
          notes_internal: notarizationFields.notes_internal || null,
        });
      }
      if (opts?.advanceTo) payload.status = opts.advanceTo;

      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setSavedAt(new Date());
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handToThisDevice() {
    await saveDraft();
    const res = await fetch(`/api/orders/${order.id}/handoff`, { method: 'POST' });
    if (!res.ok) {
      alert('Failed to start handoff');
      return;
    }
    const data = await res.json();
    const ret = encodeURIComponent(`${basePath}/${order.id}`);
    window.location.href = `/orders/c/${data.token}?return=${ret}`;
  }

  async function recordPayment(payload: { payment_method: PaymentMethod; payment_reference: string | null; amount_paid_cents: number }) {
    const res = await fetch(`/api/orders/${order.id}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      alert('Failed to record payment');
      return;
    }
    await reload();
  }

  async function generateInvoice() {
    const res = await fetch(`/api/orders/${order.id}/invoice`, { method: 'POST' });
    if (!res.ok) {
      alert('Failed to generate invoice');
      return;
    }
    await reload();
    router.push(`${basePath}/${order.id}/invoice`);
  }

  const idPhotosRequired = order.order_type === 'notarization';

  const statusLabel = STATUS_LABELS[order.status];
  const showSetup = order.status === 'draft' || order.status === 'awaiting_customer';
  const showFinalize = ['customer_completed', 'awaiting_payment'].includes(order.status);
  const showInvoice = order.status === 'paid' || order.status === 'completed';

  return (
    <div className="space-y-5">
      <OrderRealtime orderId={order.id} onChange={reload} />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{order.order_number}</h1>
          <p className="text-sm text-gray-500">
            {order.order_type === 'apostille' ? 'Apostille / Authentication' : 'Notarization / Oath Commissioner'}
            {' · '}
            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusLabel.tone}`}>{statusLabel.label}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {savedAt && <span>Saved {savedAt.toLocaleTimeString()}</span>}
          <button
            onClick={reload}
            className="flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 mt-0.5" /> {error}
        </div>
      )}

      {/* Setup stage */}
      {showSetup && (
        <section className="rounded-lg border border-gray-200 bg-white p-4 md:p-5 space-y-5">
          <h2 className="text-sm font-semibold text-gray-700">Service details</h2>
          {order.order_type === 'apostille' ? (
            <ApostilleServiceFields values={apostilleFields} onChange={setApostilleFields} />
          ) : (
            <NotarizationServiceFields values={notarizationFields} onChange={setNotarizationFields} />
          )}

          <LineItemsEditor orderType={order.order_type} items={items} onChange={setItems} />

          <div className="flex items-center justify-between border-t border-gray-200 pt-3 text-sm">
            <span className="text-gray-500">Live total</span>
            <div className="space-y-0.5 text-right">
              <div className="text-xs text-gray-500">Subtotal {formatCents(totals.subtotalCents)} · GST {formatCents(totals.taxCents)}</div>
              <div className="text-base font-semibold text-gray-900">{formatCents(totals.totalCents)}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={() => saveDraft()}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save draft'}
            </button>
            <button
              type="button"
              onClick={handToThisDevice}
              disabled={saving || items.length === 0}
              className="flex items-center gap-1.5 rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50"
            >
              <Tablet className="h-4 w-4" /> Hand to customer (this device)
            </button>
            <button
              type="button"
              onClick={async () => { await saveDraft(); setHandoffOpen(true); }}
              disabled={saving || items.length === 0}
              className="flex items-center gap-1.5 rounded-md border border-navy bg-white px-4 py-2 text-sm font-medium text-navy hover:bg-navy/5 disabled:opacity-50"
            >
              <Smartphone className="h-4 w-4" /> Send to customer tablet
            </button>
          </div>
        </section>
      )}

      {/* Awaiting customer (web→tablet) */}
      {order.status === 'awaiting_customer' && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 md:p-5">
          <p className="text-sm text-amber-900">
            Waiting for customer to complete on tablet. This page will refresh automatically when they submit.
          </p>
        </section>
      )}

      {/* Finalize */}
      {showFinalize && (
        <>
          <section className="rounded-lg border border-gray-200 bg-white p-4 md:p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">Customer details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Name:</span> <span className="font-medium">{order.customer_name || '—'}</span></div>
              <div><span className="text-gray-500">Email:</span> <span className="font-medium">{order.customer_email || '—'}</span></div>
              <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{order.customer_phone || '—'}</span></div>
              <div><span className="text-gray-500">DOB:</span> <span className="font-medium">{order.customer_dob || '—'}</span></div>
              <div className="md:col-span-2">
                <span className="text-gray-500">Address:</span>{' '}
                <span className="font-medium">
                  {[order.customer_address_unit, order.customer_address_street, order.customer_address_city, order.customer_address_province, order.customer_address_postal, order.customer_address_country].filter(Boolean).join(', ') || '—'}
                </span>
              </div>
              {order.customer_notes && <div className="md:col-span-2"><span className="text-gray-500">Notes:</span> <span className="font-medium">{order.customer_notes}</span></div>}
            </div>
            {order.signature_url && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Signature ({order.signed_at ? new Date(order.signed_at).toLocaleString() : ''})</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={order.signature_url} alt="Customer signature" className="h-20 rounded border border-gray-200 bg-white" />
              </div>
            )}
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-4 md:p-5">
            <IdPhotosSection orderId={order.id} required={idPhotosRequired} />
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-4 md:p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">Payment</h2>
            {idPhotosRequired && initialPhotos.length === 0 && (
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                ID photos are required for notarization orders. Please upload at least one before recording payment.
              </div>
            )}
            <PaymentSection
              totalCents={order.total_cents}
              initialMethod={order.payment_method}
              initialReference={order.payment_reference}
              initialAmountCents={order.amount_paid_cents}
              onRecord={recordPayment}
              disabled={idPhotosRequired && initialPhotos.length === 0}
            />
          </section>
        </>
      )}

      {/* Invoice */}
      {showInvoice && (
        <section className="rounded-lg border border-gray-200 bg-white p-4 md:p-5 space-y-3">
          <div className="flex items-center gap-2 text-green-700">
            <Check className="h-5 w-5" />
            <h2 className="text-sm font-semibold">Order paid</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><span className="text-gray-500">Method:</span> <span className="font-medium capitalize">{order.payment_method?.replace('_', ' ')}</span></div>
            <div><span className="text-gray-500">Reference:</span> <span className="font-medium">{order.payment_reference || '—'}</span></div>
            <div><span className="text-gray-500">Amount:</span> <span className="font-medium">{formatCents(order.amount_paid_cents || 0)}</span></div>
            <div><span className="text-gray-500">Paid:</span> <span className="font-medium">{order.paid_at ? new Date(order.paid_at).toLocaleString() : '—'}</span></div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={generateInvoice}
              className="flex items-center gap-1.5 rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90"
            >
              <Receipt className="h-4 w-4" /> {order.invoice_generated_at ? 'Reopen invoice' : 'Generate invoice'}
            </button>
            <a
              href={`${basePath}/${order.id}/invoice`}
              className="flex items-center gap-1.5 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Printer className="h-4 w-4" /> Print invoice
            </a>
          </div>
        </section>
      )}

      <HandoffModal orderId={order.id} open={handoffOpen} onClose={() => setHandoffOpen(false)} onTokenIssued={reload} />
    </div>
  );
}
