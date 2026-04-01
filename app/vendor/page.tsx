'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarCheck, Clock, AlertTriangle, Link as LinkIcon, Copy, Check } from 'lucide-react';
import StatCard from '@/components/admin/StatCard';
import StatusBadge from '@/components/admin/StatusBadge';

type Booking = {
  id: string;
  name: string;
  service_name: string;
  appointment_datetime: string | null;
  status: string;
  commissioner_id?: string;
  created_at: string;
};

export default function VendorDashboard() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/vendor/bookings')
      .then((r) => r.json())
      .then((d) => { setBookings(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const pending = bookings.filter((b) => b.status === 'paid');
  const confirmed = bookings.filter((b) => b.status === 'confirmed');
  const today = bookings.filter((b) =>
    b.appointment_datetime && new Date(b.appointment_datetime).toDateString() === new Date().toDateString()
  );

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-navy border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Awaiting Confirmation" value={pending.length} icon={AlertTriangle} highlight={pending.length > 0} />
        <StatCard label="Today's Appointments" value={today.length} icon={CalendarCheck} />
        <StatCard label="Confirmed Upcoming" value={confirmed.length} icon={Clock} />
      </div>

      {/* Booking link */}
      <BookingLinkCard bookings={bookings} />

      {pending.length > 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <p className="text-sm text-orange-800"><strong>{pending.length}</strong> booking{pending.length !== 1 ? 's' : ''} need your confirmation.</p>
            <button onClick={() => router.push('/vendor/bookings?status=paid')} className="ml-auto rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700">
              Review Now
            </button>
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-lg font-medium text-gray-900">Recent Bookings</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Service</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {bookings.slice(0, 10).map((b) => (
                <tr key={b.id} onClick={() => router.push(`/vendor/bookings/${b.id}`)} className="cursor-pointer hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{b.name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{b.service_name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                    {b.appointment_datetime ? new Date(b.appointment_datetime).toLocaleString('en-CA', { timeZone: 'America/Edmonton', dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm"><StatusBadge status={b.status} /></td>
                </tr>
              ))}
              {bookings.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">No bookings yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BookingLinkCard({ bookings }: { bookings: Booking[] }) {
  const [copied, setCopied] = useState(false);
  // Get commissioner ID from bookings or fetch from profile API
  const [vendorId, setVendorId] = useState<string | null>(null);

  useEffect(() => {
    // Try to get from bookings first
    const id = bookings.find((b) => b.commissioner_id)?.commissioner_id;
    if (id) { setVendorId(id); return; }
    // Fallback: fetch from vendor profile endpoint
    fetch('/api/vendor/bookings').then((r) => r.json()).then((d) => {
      const cid = (Array.isArray(d) ? d : []).find((b: Booking) => b.commissioner_id)?.commissioner_id;
      if (cid) setVendorId(cid);
    }).catch(() => {});
  }, [bookings]);

  if (!vendorId) return null;

  const bookingUrl = `https://calgaryoaths.com/book/${vendorId}`;

  function handleCopy() {
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
        <LinkIcon size={18} className="text-gold" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">Your booking link</p>
        <p className="text-xs text-gray-500 truncate">{bookingUrl}</p>
      </div>
      <button onClick={handleCopy}
        className="inline-flex items-center gap-1.5 rounded-md bg-navy px-3 py-1.5 text-xs font-medium text-white hover:bg-navy/90 flex-shrink-0">
        {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
      </button>
    </div>
  );
}
