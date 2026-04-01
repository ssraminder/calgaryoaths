'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

type Props = {
  commissionerId: string;
  locationId?: string;
  onSelect: (isoDatetime: string) => void;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function toCalgarDate(iso: string) {
  return new Date(iso).toLocaleString('en-CA', {
    timeZone: 'America/Edmonton',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function startOfCalgarDay(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function SlotPicker({ commissionerId, locationId, onSelect }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? 0 : 1)); // start Mon
    return d;
  });
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string>('');

  // Build 7-day view from weekStart
  const days: Date[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const startDateStr = today.toISOString().slice(0, 10);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ commissionerId, startDate: startDateStr });
      if (locationId) params.set('locationId', locationId);
      const res = await fetch(`/api/booking/slots?${params}`);
      const json = await res.json();
      setSlots(json.slots ?? []);
    } finally {
      setLoading(false);
    }
  }, [commissionerId, startDateStr]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  // Slots for the selected date (in Calgary local time)
  const slotsForDate = slots.filter((s) => {
    const localDate = new Date(s).toLocaleDateString('en-CA', { timeZone: 'America/Edmonton' });
    return localDate === selectedDate;
  });

  // Available dates set
  const availableDates = new Set(
    slots.map((s) => new Date(s).toLocaleDateString('en-CA', { timeZone: 'America/Edmonton' }))
  );

  const canGoPrev = weekStart > today;

  return (
    <div className="select-none">
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          type="button"
          onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); setSelectedDate(''); }}
          disabled={!canGoPrev}
          className="p-1.5 rounded-btn text-mid-grey hover:text-charcoal disabled:opacity-30 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-medium text-charcoal">
          {MONTHS[weekStart.getMonth()]} {weekStart.getFullYear()}
        </span>
        <button
          type="button"
          onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); setSelectedDate(''); }}
          className="p-1.5 rounded-btn text-mid-grey hover:text-charcoal transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day selector */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {days.map((d) => {
          const iso = d.toISOString().slice(0, 10);
          const isPast = d < today;
          const hasSlots = availableDates.has(iso);
          const isSelected = selectedDate === iso;

          return (
            <button
              key={iso}
              type="button"
              disabled={isPast || !hasSlots || loading}
              onClick={() => setSelectedDate(iso)}
              className={`flex flex-col items-center py-2 rounded-card text-xs transition-all border ${
                isSelected
                  ? 'bg-navy text-white border-navy'
                  : hasSlots && !isPast
                  ? 'border-border hover:border-gold hover:bg-gold/5 text-charcoal'
                  : 'border-transparent text-mid-grey opacity-40 cursor-not-allowed'
              }`}
            >
              <span className="text-[10px] uppercase tracking-wide mb-0.5">{WEEKDAYS[d.getDay()]}</span>
              <span className="font-semibold text-sm">{d.getDate()}</span>
              {hasSlots && !isPast && !isSelected && (
                <span className="w-1 h-1 rounded-full bg-teal mt-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Time slots */}
      {loading && (
        <div className="flex items-center justify-center py-6 gap-2 text-mid-grey text-sm">
          <Loader2 size={15} className="animate-spin" /> Loading available times…
        </div>
      )}

      {!loading && selectedDate && slotsForDate.length === 0 && (
        <p className="text-center text-sm text-mid-grey py-4">No slots available on this day.</p>
      )}

      {!loading && !selectedDate && (
        <p className="text-center text-sm text-mid-grey py-4">Select a date above to see available times.</p>
      )}

      {!loading && slotsForDate.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {slotsForDate.map((s) => {
            const time = new Date(s).toLocaleTimeString('en-CA', {
              timeZone: 'America/Edmonton',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            });
            const isChosen = selected === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setSelected(s);
                  onSelect(s);
                }}
                className={`py-2.5 rounded-card text-sm font-medium border transition-all ${
                  isChosen
                    ? 'bg-gold text-white border-gold'
                    : 'border-border hover:border-gold hover:bg-gold/5 text-charcoal'
                }`}
              >
                {time}
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <p className="mt-3 text-xs text-center text-mid-grey">
          Selected: <span className="font-medium text-charcoal">{toCalgarDate(selected)}</span>
        </p>
      )}
    </div>
  );
}
