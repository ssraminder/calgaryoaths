'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Truck, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import type { Order } from '@/lib/orders/types';

interface Rate {
  id: string;
  carrier: string;
  service: string;
  rate: number;
  currency: string;
  delivery_days: number | null;
  est_delivery_date: string | null;
  delivery_date_guaranteed: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  order: Pick<
    Order,
    | 'id'
    | 'customer_name'
    | 'customer_address_street'
    | 'customer_address_unit'
    | 'customer_address_city'
    | 'customer_address_province'
    | 'customer_address_postal'
    | 'customer_address_country'
  >;
}

const PRESETS = {
  flat_document: {
    label: 'Flat document envelope (~250g, 30×22×2cm)',
    weight_g: 250,
    length_cm: 30,
    width_cm: 22,
    height_cm: 2,
  },
  small_box: {
    label: 'Small box (~500g, 25×18×10cm)',
    weight_g: 500,
    length_cm: 25,
    width_cm: 18,
    height_cm: 10,
  },
  custom: {
    label: 'Custom',
    weight_g: 250,
    length_cm: 30,
    width_cm: 22,
    height_cm: 2,
  },
} as const;
type PresetKey = keyof typeof PRESETS;

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export default function ShippingRatesModal({ open, onClose, order }: Props) {
  const [preset, setPreset] = useState<PresetKey>('flat_document');
  const [weight, setWeight] = useState<number>(PRESETS.flat_document.weight_g);
  const [length, setLength] = useState<number>(PRESETS.flat_document.length_cm);
  const [width, setWidth] = useState<number>(PRESETS.flat_document.width_cm);
  const [height, setHeight] = useState<number>(PRESETS.flat_document.height_cm);
  const [loading, setLoading] = useState(false);
  const [rates, setRates] = useState<Rate[]>([]);
  const [messages, setMessages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (!open) {
      setRates([]);
      setMessages([]);
      setError(null);
      setHasFetched(false);
    }
  }, [open]);

  function applyPreset(key: PresetKey) {
    setPreset(key);
    if (key !== 'custom') {
      const p = PRESETS[key];
      setWeight(p.weight_g);
      setLength(p.length_cm);
      setWidth(p.width_cm);
      setHeight(p.height_cm);
    }
  }

  const destination = useMemo(
    () =>
      [
        order.customer_address_unit,
        order.customer_address_street,
        order.customer_address_city,
        order.customer_address_province,
        order.customer_address_postal,
        order.customer_address_country,
      ]
        .filter(Boolean)
        .join(', '),
    [order]
  );

  async function calculate() {
    setLoading(true);
    setError(null);
    setMessages([]);
    try {
      const res = await fetch(`/api/orders/${order.id}/shipping-rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parcel: {
            weight_g: weight,
            length_cm: length,
            width_cm: width,
            height_cm: height,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      setRates(data.rates || []);
      setMessages(data.messages || []);
      setHasFetched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rates');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center">
      <div className="my-6 w-full max-w-3xl rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-200 p-4">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-navy" />
            <div>
              <h2 className="text-base font-semibold text-gray-900">Shipping rates</h2>
              <p className="mt-0.5 text-xs text-gray-500">Calgary, AB → {destination || 'destination'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
            <span className="font-medium text-gray-700">Destination:</span> {destination || '—'}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Parcel preset</label>
            <select
              value={preset}
              onChange={(e) => applyPreset(e.target.value as PresetKey)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {(Object.keys(PRESETS) as PresetKey[]).map((k) => (
                <option key={k} value={k}>{PRESETS[k].label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="Weight (g)" value={weight} onChange={(v) => { setWeight(v); setPreset('custom'); }} />
            <Field label="Length (cm)" value={length} onChange={(v) => { setLength(v); setPreset('custom'); }} />
            <Field label="Width (cm)" value={width} onChange={(v) => { setWidth(v); setPreset('custom'); }} />
            <Field label="Height (cm)" value={height} onChange={(v) => { setHeight(v); setPreset('custom'); }} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={calculate}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {loading ? 'Calculating…' : hasFetched ? 'Refresh rates' : 'Calculate rates'}
            </button>
            <p className="text-xs text-gray-500">Rates are fetched on demand from Shippo. Each click hits the API.</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {messages.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="font-medium">Carrier notes</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {messages.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>
          )}

          {hasFetched && rates.length === 0 && !error && (
            <p className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
              No rates returned. Check destination address, parcel size, or the carrier notes above.
            </p>
          )}

          {rates.length > 0 && (
            <div className="overflow-hidden rounded-md border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Carrier</th>
                    <th className="px-3 py-2 font-medium">Service</th>
                    <th className="px-3 py-2 font-medium">Transit</th>
                    <th className="px-3 py-2 text-right font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rates.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-900">{r.carrier}</td>
                      <td className="px-3 py-2 text-gray-700">{r.service}</td>
                      <td className="px-3 py-2 text-gray-600">
                        {r.delivery_days != null ? `${r.delivery_days} day${r.delivery_days === 1 ? '' : 's'}` : '—'}
                        {r.est_delivery_date && (
                          <span className="ml-1 text-xs text-gray-400">
                            (by {new Date(r.est_delivery_date).toLocaleDateString()})
                          </span>
                        )}
                        {r.delivery_date_guaranteed && (
                          <span className="ml-1 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">guaranteed</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900">
                        {formatMoney(r.rate, r.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-gray-200 p-3">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-700">{label}</label>
      <input
        type="number"
        min={0}
        step="0.1"
        value={value}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
    </div>
  );
}
