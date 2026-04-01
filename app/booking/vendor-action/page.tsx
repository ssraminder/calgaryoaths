'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Clock, Calendar } from 'lucide-react';

type Booking = {
  id: string;
  name: string;
  email: string;
  phone: string;
  service_name: string;
  appointment_datetime: string | null;
  status: string;
  amount_paid: number | null;
  notes: string | null;
  num_documents: number;
  created_at: string;
};

type AvailabilityRule = { day_of_week: number; start_time: string; end_time: string };

const SLOT_MINUTES = 30;
const DAYS_AHEAD = 14;

function calgaryOffset(): number {
  const now = new Date();
  const jan = new Date(now.getFullYear(), 0, 1).getTimezoneOffset();
  const jul = new Date(now.getFullYear(), 6, 1).getTimezoneOffset();
  const isDST = Math.min(jan, jul) === now.getTimezoneOffset();
  return isDST ? -6 : -7;
}

function generateSlots(rules: AvailabilityRule[], bookedSet: Set<string>): Record<string, string[]> {
  const offset = calgaryOffset();
  const now = new Date();
  const cutoff = new Date(Date.now() + 60 * 60 * 1000);
  const byDate: Record<string, string[]> = {};

  for (let i = 0; i < DAYS_AHEAD; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const [year, month, day] = dateStr.split('-').map(Number);
    const dayOfWeek = new Date(year, month - 1, day).getDay();
    const dayRules = rules.filter((r) => r.day_of_week === dayOfWeek);

    const daySlots: string[] = [];
    for (const rule of dayRules) {
      const [startH, startM] = rule.start_time.split(':').map(Number);
      const [endH, endM] = rule.end_time.split(':').map(Number);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;
      for (let m = startMin; m + SLOT_MINUTES <= endMin; m += SLOT_MINUTES) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        const utcH = h - offset;
        const slot = new Date(Date.UTC(year, month - 1, day, utcH, min, 0));
        const iso = slot.toISOString();
        if (slot > cutoff && !bookedSet.has(iso)) {
          daySlots.push(iso);
        }
      }
    }
    if (daySlots.length > 0) byDate[dateStr] = daySlots;
  }
  return byDate;
}

export default function VendorActionPage() {
  return <Suspense><VendorActionContent /></Suspense>;
}

function VendorActionContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const directAction = searchParams.get('action'); // 'accept' from email link

  const [booking, setBooking] = useState<Booking | null>(null);
  const [slotsByDate, setSlotsByDate] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Action states
  const [acting, setActing] = useState(false);
  const [done, setDone] = useState<'accepted' | 'proposed' | null>(null);
  const [showPropose, setShowPropose] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [reason, setReason] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    if (!token) { setError('Missing token'); setLoading(false); return; }

    // If direct accept from email
    if (directAction === 'accept') {
      fetch('/api/booking/vendor-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action: 'accept' }),
      }).then((r) => r.json()).then((d) => {
        if (d.success) setDone('accepted');
        else setError(d.error || 'Failed');
        setLoading(false);
      }).catch(() => { setError('Network error'); setLoading(false); });
      return;
    }

    // Load booking + availability
    fetch(`/api/booking/vendor-action?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); setLoading(false); return; }
        setBooking(data.booking);
        const bookedSet = new Set<string>(data.bookedSlots || []);
        const slots = generateSlots(data.availabilityRules || [], bookedSet);
        setSlotsByDate(slots);
        const firstDate = Object.keys(slots)[0];
        if (firstDate) setSelectedDate(firstDate);
        setLoading(false);
      })
      .catch(() => { setError('Failed to load'); setLoading(false); });
  }, [token, directAction]);

  async function handleAccept() {
    setActing(true);
    const res = await fetch('/api/booking/vendor-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, action: 'accept' }),
    });
    const data = await res.json();
    if (data.success) setDone('accepted');
    else setError(data.error || 'Failed');
    setActing(false);
  }

  async function handlePropose() {
    if (!selectedSlot) return;
    setActing(true);
    const res = await fetch('/api/booking/vendor-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, action: 'propose', proposed_datetime: selectedSlot, reason }),
    });
    const data = await res.json();
    if (data.success) setDone('proposed');
    else setError(data.error || 'Failed');
    setActing(false);
  }

  const fmtDate = (d: string) => new Date(d).toLocaleString('en-CA', {
    timeZone: 'America/Edmonton', dateStyle: 'full', timeStyle: 'short',
  });
  const fmtTime = (d: string) => new Date(d).toLocaleString('en-CA', {
    timeZone: 'America/Edmonton', timeStyle: 'short',
  });
  const fmtDayLabel = (d: string) => {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('en-CA', {
      timeZone: 'America/Edmonton', weekday: 'short', month: 'short', day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="max-w-md text-center">
          <h1 className="font-display text-2xl font-bold text-charcoal">Something went wrong</h1>
          <p className="mt-2 text-mid-grey">{error}</p>
        </div>
      </div>
    );
  }

  if (done === 'accepted') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="max-w-md text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal/10">
            <CheckCircle className="h-8 w-8 text-teal" />
          </div>
          <h1 className="font-display text-2xl font-bold text-charcoal">Booking Confirmed</h1>
          <p className="text-mid-grey">The customer has been notified that their appointment is confirmed.</p>
        </div>
      </div>
    );
  }

  if (done === 'proposed') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="max-w-md text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold/10">
            <Clock className="h-8 w-8 text-gold" />
          </div>
          <h1 className="font-display text-2xl font-bold text-charcoal">New Time Proposed</h1>
          <p className="text-mid-grey">The customer has been emailed with the new time. They can accept or request a refund.</p>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  const dates = Object.keys(slotsByDate);

  return (
    <div className="min-h-screen bg-bg py-8 px-4">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="text-center">
          <Calendar className="mx-auto h-10 w-10 text-navy" />
          <h1 className="mt-3 font-display text-2xl font-bold text-charcoal">New Booking</h1>
          <p className="text-mid-grey text-sm">Review and confirm this appointment</p>
        </div>

        {/* Booking details */}
        <div className="rounded-card border border-border bg-white p-5">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-mid-grey">Customer</dt><dd className="font-medium text-charcoal">{booking.name}</dd></div>
            <div className="flex justify-between"><dt className="text-mid-grey">Email</dt><dd>{booking.email}</dd></div>
            <div className="flex justify-between"><dt className="text-mid-grey">Phone</dt><dd>{booking.phone}</dd></div>
            <div className="flex justify-between"><dt className="text-mid-grey">Service</dt><dd className="font-medium text-charcoal">{booking.service_name}</dd></div>
            <div className="flex justify-between"><dt className="text-mid-grey">Requested Time</dt><dd className="font-medium text-navy">{booking.appointment_datetime ? fmtDate(booking.appointment_datetime) : '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-mid-grey">Documents</dt><dd>{booking.num_documents}</dd></div>
            <div className="flex justify-between"><dt className="text-mid-grey">Paid</dt><dd className="font-semibold text-teal">{booking.amount_paid ? `$${(booking.amount_paid / 100).toFixed(2)}` : '—'}</dd></div>
          </dl>
          {booking.notes && (
            <div className="mt-3 rounded-btn bg-bg p-3">
              <p className="text-xs font-medium text-mid-grey">Customer Notes</p>
              <p className="mt-1 text-sm text-charcoal">{booking.notes}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        {!showPropose ? (
          <div className="space-y-3">
            <button onClick={handleAccept} disabled={acting}
              className="btn-primary w-full justify-center py-3 text-base disabled:opacity-50">
              {acting ? 'Confirming...' : 'Confirm This Time'}
            </button>
            <button onClick={() => setShowPropose(true)} disabled={acting}
              className="w-full rounded-btn border-2 border-gold text-gold font-medium py-3 text-sm hover:bg-gold/5 disabled:opacity-50">
              Suggest Another Time
            </button>
          </div>
        ) : (
          <div className="rounded-card border border-border bg-white p-5 space-y-4">
            <h2 className="font-display font-semibold text-charcoal">Pick a new time</h2>

            {/* Date tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {dates.map((d) => (
                <button key={d} onClick={() => { setSelectedDate(d); setSelectedSlot(''); }}
                  className={`flex-shrink-0 rounded-pill px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedDate === d ? 'bg-navy text-white' : 'bg-bg text-charcoal hover:bg-border'
                  }`}>
                  {fmtDayLabel(d)}
                </button>
              ))}
              {dates.length === 0 && <p className="text-sm text-mid-grey">No availability in the next 14 days</p>}
            </div>

            {/* Time slots */}
            {selectedDate && slotsByDate[selectedDate] && (
              <div className="flex flex-wrap gap-2">
                {slotsByDate[selectedDate].map((slot) => (
                  <button key={slot} onClick={() => setSelectedSlot(slot)}
                    className={`rounded-btn px-3 py-2 text-sm font-medium transition-colors ${
                      selectedSlot === slot ? 'bg-gold text-white' : 'bg-bg text-charcoal hover:bg-gold/10'
                    }`}>
                    {fmtTime(slot)}
                  </button>
                ))}
              </div>
            )}

            {/* Reason */}
            <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-btn border border-border px-3 py-2 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
              placeholder="Reason for time change (optional, shown to customer)..." />

            <div className="flex gap-2">
              <button onClick={() => { setShowPropose(false); setSelectedSlot(''); }}
                className="flex-1 rounded-btn border border-border py-2.5 text-sm text-mid-grey hover:bg-bg">
                Cancel
              </button>
              <button onClick={handlePropose} disabled={acting || !selectedSlot}
                className="flex-1 btn-primary justify-center py-2.5 disabled:opacity-50">
                {acting ? 'Sending...' : 'Send Proposal'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
