'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Smartphone, Tablet, Receipt, Printer, Check, AlertCircle, RefreshCw, FileText, Mail, Pencil, X, Ban } from 'lucide-react';
import LineItemsEditor from './LineItemsEditor';
import ApostilleServiceFields, { apostileInitialFromOrder } from './ApostilleServiceFields';
import NotarizationServiceFields, { notarizationInitialFromOrder } from './NotarizationServiceFields';
import IdPhotosSection from './IdPhotosSection';
import PaymentSection from './PaymentSection';
import HandoffModal from './HandoffModal';
import OrderRealtime from './OrderRealtime';
import TaxProvinceSelect from './TaxProvinceSelect';
import CustomerInfoForm, { type CustomerFormValues } from './CustomerInfoForm';
import OrderEventsLog from './OrderEventsLog';
import { computeTotals, formatCents, type TaxRateRow } from '@/lib/orders/pricing';
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
  const [photos, setPhotos] = useState<OrderIdPhoto[]>(initialPhotos);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [eventsRefreshKey, setEventsRefreshKey] = useState(0);
  const [customerEdits, setCustomerEdits] = useState<CustomerFormValues>({
    customer_name: initialOrder.customer_name || '',
    customer_email: initialOrder.customer_email || '',
    customer_phone: initialOrder.customer_phone || '',
    customer_address_street: initialOrder.customer_address_street || '',
    customer_address_unit: initialOrder.customer_address_unit || '',
    customer_address_city: initialOrder.customer_address_city || '',
    customer_address_province: initialOrder.customer_address_province || '',
    customer_address_postal: initialOrder.customer_address_postal || '',
    customer_address_country: initialOrder.customer_address_country || 'Canada',
    customer_notes: initialOrder.customer_notes || '',
  });
  const [editDiscountCents, setEditDiscountCents] = useState<number>(initialOrder.discount_cents ?? 0);
  const [editDiscountReason, setEditDiscountReason] = useState<string>(initialOrder.discount_reason ?? '');

  // Service field state (controlled)
  const [apostilleFields, setApostilleFields] = useState(() => apostileInitialFromOrder(order));
  const [notarizationFields, setNotarizationFields] = useState(() => notarizationInitialFromOrder(order));

  // Tax province + rate (defaults to AB / 5% GST if order has no value yet)
  const [taxProvinceCode, setTaxProvinceCode] = useState<string>(order.tax_province_code || 'AB');
  const [taxRates, setTaxRates] = useState<TaxRateRow[]>([]);
  const selectedTaxRate = useMemo<TaxRateRow | null>(
    () => taxRates.find((r) => r.province_code === taxProvinceCode) || null,
    [taxRates, taxProvinceCode]
  );

  useEffect(() => {
    let cancelled = false;
    fetch('/api/orders/tax-rates')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (!cancelled && d?.taxRates) setTaxRates(d.taxRates); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const totals = useMemo(() => {
    const travelFee = order.order_type === 'notarization' && notarizationFields.delivery_mode === 'mobile'
      ? notarizationFields.travel_fee_cents
      : 0;
    return computeTotals({
      items,
      travelFeeCents: travelFee,
      discountCents: order.discount_cents ?? 0,
      taxRate: selectedTaxRate,
    });
  }, [items, notarizationFields.delivery_mode, notarizationFields.travel_fee_cents, order.discount_cents, order.order_type, selectedTaxRate]);

  const reload = useCallback(async () => {
    const res = await fetch(`/api/orders/${order.id}`);
    if (res.ok) {
      const data = await res.json();
      setOrder(data.order);
      setItems(data.items || []);
      if (data.order.order_type === 'apostille') setApostilleFields(apostileInitialFromOrder(data.order));
      else setNotarizationFields(notarizationInitialFromOrder(data.order));
      setCustomerEdits({
        customer_name: data.order.customer_name || '',
        customer_email: data.order.customer_email || '',
        customer_phone: data.order.customer_phone || '',
        customer_address_street: data.order.customer_address_street || '',
        customer_address_unit: data.order.customer_address_unit || '',
        customer_address_city: data.order.customer_address_city || '',
        customer_address_province: data.order.customer_address_province || '',
        customer_address_postal: data.order.customer_address_postal || '',
        customer_address_country: data.order.customer_address_country || 'Canada',
        customer_notes: data.order.customer_notes || '',
      });
      setEditDiscountCents(data.order.discount_cents ?? 0);
      setEditDiscountReason(data.order.discount_reason ?? '');
      setEventsRefreshKey((k) => k + 1);
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
        tax_province_code: taxProvinceCode,
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
          tracking_to_gov: apostilleFields.tracking_to_gov || null,
          tracking_from_gov: apostilleFields.tracking_from_gov || null,
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

  async function emailCustomer() {
    if (!order.customer_email) {
      alert('No customer email on file for this order.');
      return;
    }
    if (!confirm(`Send invoice${order.signature_url ? ' and signed terms' : ''} to ${order.customer_email}?`)) return;
    setEmailSending(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/send-email`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'Failed to send email');
        return;
      }
      alert(`Email sent to ${data.sent_to}.`);
    } finally {
      setEmailSending(false);
    }
  }

  async function saveEdits() {
    if ((order.status === 'paid' || order.status === 'completed')
      && !confirm('This order is already paid. Editing line items or discount will change the recorded totals. Continue?')) {
      return;
    }
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
        tax_province_code: taxProvinceCode,
        discount_cents: editDiscountCents || 0,
        discount_reason: editDiscountReason || null,
        customer_name: customerEdits.customer_name,
        customer_email: customerEdits.customer_email,
        customer_phone: customerEdits.customer_phone,
        customer_address_street: customerEdits.customer_address_street || null,
        customer_address_unit: customerEdits.customer_address_unit || null,
        customer_address_city: customerEdits.customer_address_city || null,
        customer_address_province: customerEdits.customer_address_province || null,
        customer_address_postal: customerEdits.customer_address_postal || null,
        customer_address_country: customerEdits.customer_address_country || null,
        customer_notes: customerEdits.customer_notes || null,
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
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setSavedAt(new Date());
      setEditing(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function cancelOrder() {
    const reason = prompt('Reason for cancelling this order? (visible in the change log)');
    if (reason === null) return;
    const trimmed = reason.trim();
    if (!trimmed) { alert('A reason is required to cancel an order.'); return; }
    if (!confirm(`Cancel order ${order.order_number}? This cannot be undone here.`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', cancelled_reason: trimmed }),
      });
      if (!res.ok) {
        alert('Failed to cancel order');
        return;
      }
      setEditing(false);
      await reload();
    } finally {
      setSaving(false);
    }
  }

  const idPhotosRequired = order.order_type === 'notarization';

  const statusLabel = STATUS_LABELS[order.status];
  const showSetup = order.status === 'draft' || order.status === 'awaiting_customer';
  const showFinalize = ['customer_completed', 'awaiting_payment'].includes(order.status);
  const showInvoice = order.status === 'paid' || order.status === 'completed';
  const isCancelled = order.status === 'cancelled';
  const canEdit = !isCancelled && !showSetup; // setup section already exposes editing
  const canCancel = !isCancelled && order.status !== 'completed';

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
          {canEdit && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-gray-700 hover:bg-gray-50"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit order
            </button>
          )}
          {canCancel && (
            <button
              onClick={cancelOrder}
              disabled={saving}
              className="flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              <Ban className="h-3.5 w-3.5" /> Cancel order
            </button>
          )}
          <button
            onClick={reload}
            className="flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {isCancelled && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <p className="font-semibold">Order cancelled</p>
          {order.cancelled_reason && <p className="text-xs mt-0.5">Reason: {order.cancelled_reason}</p>}
          {order.cancelled_at && <p className="text-xs">at {new Date(order.cancelled_at).toLocaleString()}</p>}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 mt-0.5" /> {error}
        </div>
      )}

      {/* Edit order panel */}
      {editing && canEdit && (
        <section className="rounded-lg border border-amber-200 bg-amber-50/40 p-4 md:p-5 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">Edit order</h2>
              <p className="text-xs text-gray-600 mt-0.5">Changes are recorded in the change log below.</p>
            </div>
            <button
              type="button"
              onClick={() => { setEditing(false); reload(); }}
              className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              <X className="h-3.5 w-3.5" /> Discard
            </button>
          </div>

          <div className="rounded-md border border-gray-200 bg-white p-4">
            <CustomerInfoForm initial={customerEdits} onChange={setCustomerEdits} />
          </div>

          <div className="rounded-md border border-gray-200 bg-white p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Service & items</h3>
            {order.order_type === 'apostille' ? (
              <ApostilleServiceFields values={apostilleFields} onChange={setApostilleFields} />
            ) : (
              <NotarizationServiceFields values={notarizationFields} onChange={setNotarizationFields} />
            )}
            <LineItemsEditor orderType={order.order_type} items={items} onChange={setItems} />
          </div>

          <div className="rounded-md border border-gray-200 bg-white p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <TaxProvinceSelect
              value={taxProvinceCode}
              onChange={(code) => setTaxProvinceCode(code)}
              rates={taxRates}
            />
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Discount (cents)</label>
              <input
                type="number"
                min={0}
                value={editDiscountCents}
                onChange={(e) => setEditDiscountCents(parseInt(e.target.value || '0', 10) || 0)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-[10px] text-gray-500">Entered in cents. {formatCents(editDiscountCents)}</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Discount reason</label>
              <input
                type="text"
                value={editDiscountReason}
                onChange={(e) => setEditDiscountReason(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-3 space-y-0.5 md:text-right">
              <div className="text-xs text-gray-500">Subtotal {formatCents(totals.subtotalCents)}</div>
              <div className="text-xs text-gray-500">{totals.tax.label} — {formatCents(totals.taxCents)}</div>
              <div className="text-base font-semibold text-gray-900">Total {formatCents(totals.totalCents)}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-amber-200 pt-3">
            <button
              type="button"
              onClick={saveEdits}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save changes'}
            </button>
            {showInvoice && (
              <p className="text-xs text-amber-800">
                This order is already {order.status}. Saving will update recorded totals.
              </p>
            )}
          </div>
        </section>
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

          <div className="border-t border-gray-200 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <TaxProvinceSelect
              value={taxProvinceCode}
              onChange={(code) => setTaxProvinceCode(code)}
              rates={taxRates}
            />
            <div className="space-y-0.5 md:text-right">
              <div className="text-xs text-gray-500">Subtotal {formatCents(totals.subtotalCents)}</div>
              <div className="text-xs text-gray-500">{totals.tax.label} — {formatCents(totals.taxCents)}</div>
              <div className="text-base font-semibold text-gray-900">Total {formatCents(totals.totalCents)}</div>
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

      {/* Customer details, signature, signed-terms, ID photos — visible from customer submission through to completed */}
      {(showFinalize || showInvoice) && (
        <>
          <section className="rounded-lg border border-gray-200 bg-white p-4 md:p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">Customer details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Name:</span> <span className="font-medium">{order.customer_name || '—'}</span></div>
              <div><span className="text-gray-500">Email:</span> <span className="font-medium">{order.customer_email || '—'}</span></div>
              <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{order.customer_phone || '—'}</span></div>
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
            {order.signature_url && order.terms_accepted_at && (
              <div>
                <a
                  href={`${basePath}/${order.id}/terms`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  <FileText className="h-3.5 w-3.5" /> Download signed terms (PDF)
                </a>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-4 md:p-5">
            <IdPhotosSection orderId={order.id} required={idPhotosRequired} photos={photos} onChange={setPhotos} />
          </section>
        </>
      )}

      {/* Payment recording — only before the order is paid */}
      {showFinalize && (
        <section className="rounded-lg border border-gray-200 bg-white p-4 md:p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Payment</h2>
          {idPhotosRequired && photos.length === 0 && (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              Reminder: capture ID photos for this notarization. You can record payment now and upload them after.
            </div>
          )}
          <PaymentSection
            totalCents={order.total_cents}
            initialMethod={order.payment_method}
            initialReference={order.payment_reference}
            initialAmountCents={order.amount_paid_cents}
            onRecord={recordPayment}
          />
        </section>
      )}

      {/* Apostille tracking (visible once paid; staff fill these while shipping) */}
      {showInvoice && order.order_type === 'apostille' && (
        <section className="rounded-lg border border-gray-200 bg-white p-4 md:p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Apostille tracking</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Tracking # (to government)</label>
              <input
                type="text"
                value={apostilleFields.tracking_to_gov}
                onChange={(e) => setApostilleFields({ ...apostilleFields, tracking_to_gov: e.target.value })}
                placeholder="Courier tracking number for shipment to GAC / consulate"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Tracking # (from government)</label>
              <input
                type="text"
                value={apostilleFields.tracking_from_gov}
                onChange={(e) => setApostilleFields({ ...apostilleFields, tracking_from_gov: e.target.value })}
                placeholder="Courier tracking number for return shipment"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => saveDraft()}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save tracking'}
            </button>
          </div>
        </section>
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
            <button
              type="button"
              onClick={emailCustomer}
              disabled={emailSending || !order.customer_email}
              className="flex items-center gap-1.5 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              title={order.customer_email ? `Email invoice${order.signature_url ? ' & signed terms' : ''} to ${order.customer_email}` : 'No customer email on file'}
            >
              <Mail className="h-4 w-4" /> {emailSending ? 'Sending…' : 'Email to customer'}
            </button>
          </div>
        </section>
      )}

      <OrderEventsLog orderId={order.id} refreshKey={eventsRefreshKey} />

      <HandoffModal orderId={order.id} open={handoffOpen} onClose={() => setHandoffOpen(false)} onTokenIssued={reload} />
    </div>
  );
}
