'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, MapPin } from 'lucide-react';

type Location = { id: string; name: string; address: string };
type Rule = { id: string; day_of_week: number; start_time: string; end_time: string; location_id: string; location?: { id: string; name: string } };
type BlockedDate = { id: string; blocked_date: string; reason: string };
type CustomTime = { id: string; custom_date: string; start_time: string; end_time: string; reason: string };

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function VendorAvailabilityPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [newRule, setNewRule] = useState({ days: [1] as number[], start_time: '09:00', end_time: '17:00', location_id: '' });
  const [addingRule, setAddingRule] = useState(false);
  const [error, setError] = useState('');

  // Blocked dates
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [newBlockDate, setNewBlockDate] = useState('');
  const [newBlockEndDate, setNewBlockEndDate] = useState('');
  const [newBlockReason, setNewBlockReason] = useState('');

  // Custom times
  const [customTimes, setCustomTimes] = useState<CustomTime[]>([]);
  const [newCustomDate, setNewCustomDate] = useState('');
  const [newCustomStart, setNewCustomStart] = useState('09:00');
  const [newCustomEnd, setNewCustomEnd] = useState('17:00');
  const [newCustomReason, setNewCustomReason] = useState('');

  useEffect(() => {
    fetch('/api/vendor/availability').then((r) => r.json()).then((d) => {
      setRules(d.rules ?? []);
      setLocations(d.locations ?? []);
      setBlockedDates(d.blockedDates ?? []);
      setCustomTimes(d.customTimes ?? []);
      if (d.locations?.length > 0) {
        setSelectedLocation(d.locations[0].id);
        setNewRule((prev) => ({ ...prev, location_id: d.locations[0].id }));
      }
      setLoading(false);
    });
  }, []);

  async function addRule() {
    if (newRule.days.length === 0) return;
    setError('');
    setAddingRule(true);
    const res = await fetch('/api/vendor/availability', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        days_of_week: newRule.days,
        start_time: newRule.start_time,
        end_time: newRule.end_time,
        location_id: newRule.location_id || selectedLocation,
      }),
    });
    if (res.ok) {
      const result = await res.json();
      const newRules = Array.isArray(result) ? result : [result];
      setRules((prev) => [...prev, ...newRules]);
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to add rule');
    }
    setAddingRule(false);
  }

  async function deleteRule(id: string) {
    await fetch(`/api/vendor/availability?id=${id}`, { method: 'DELETE' });
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  const filteredRules = selectedLocation
    ? rules.filter((r) => r.location_id === selectedLocation)
    : rules;

  if (loading) return <div className="flex h-32 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-4 border-navy border-t-transparent" /></div>;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Availability</h1>
      <p className="text-sm text-gray-500">Set when customers can book appointments at each location. Time slots cannot overlap across locations.</p>

      {/* Location tabs */}
      {locations.length > 1 && (
        <div className="flex gap-2">
          {locations.map((loc) => (
            <button key={loc.id} onClick={() => { setSelectedLocation(loc.id); setNewRule((prev) => ({ ...prev, location_id: loc.id })); }}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${selectedLocation === loc.id ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <MapPin className="h-3 w-3" />
              {loc.name}
            </button>
          ))}
        </div>
      )}

      {/* Rules for selected location */}
      <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Weekly Schedule</h3>
        {DAYS.map((dayName, dayIdx) => {
          const dayRules = filteredRules.filter((r) => r.day_of_week === dayIdx);
          return (
            <div key={dayIdx} className="flex items-center gap-3 py-1 text-sm">
              <span className="w-24 font-medium text-gray-700">{dayName}</span>
              <div className="flex flex-wrap gap-2">
                {dayRules.length === 0 && <span className="text-xs text-gray-300">Closed</span>}
                {dayRules.map((r) => (
                  <span key={r.id} className="inline-flex items-center gap-1 rounded-full bg-navy/10 px-3 py-1 text-xs font-medium text-navy">
                    {r.start_time.slice(0, 5)} – {r.end_time.slice(0, 5)}
                    {locations.length > 1 && r.location && <span className="text-navy/50">@ {r.location.name}</span>}
                    <button onClick={() => deleteRule(r.id)} className="ml-1 text-navy/50 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add new rule */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-3">
        <h3 className="text-sm font-medium text-gray-900">Add Time Block</h3>
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Day chips with presets */}
        <div>
          <label className="mb-1.5 block text-xs text-gray-500">Days</label>
          <div className="flex flex-wrap gap-1.5">
            {/* Quick-select buttons */}
            {[
              { label: 'Weekdays', days: [1, 2, 3, 4, 5] },
              { label: 'Weekends', days: [0, 6] },
              { label: 'All', days: [0, 1, 2, 3, 4, 5, 6] },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setNewRule({ ...newRule, days: preset.days })}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  JSON.stringify([...newRule.days].sort()) === JSON.stringify([...preset.days].sort())
                    ? 'bg-gold text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
            <span className="text-gray-300 mx-1">|</span>
            {DAYS.map((dayName, dayIdx) => {
              const isSelected = newRule.days.includes(dayIdx);
              return (
                <button
                  key={dayIdx}
                  type="button"
                  onClick={() => {
                    setNewRule({
                      ...newRule,
                      days: isSelected
                        ? newRule.days.filter((d) => d !== dayIdx)
                        : [...newRule.days, dayIdx],
                    });
                  }}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-navy text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {dayName.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time + Location + Add */}
        <div className="flex flex-wrap items-end gap-3">
          {locations.length > 1 && (
            <div>
              <label className="mb-1 block text-xs text-gray-500">Location</label>
              <select value={newRule.location_id || selectedLocation} onChange={(e) => setNewRule({ ...newRule, location_id: e.target.value })} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm">
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs text-gray-500">Start</label>
            <input type="time" value={newRule.start_time} onChange={(e) => setNewRule({ ...newRule, start_time: e.target.value })} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">End</label>
            <input type="time" value={newRule.end_time} onChange={(e) => setNewRule({ ...newRule, end_time: e.target.value })} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
          </div>
          <button
            onClick={addRule}
            disabled={newRule.days.length === 0 || addingRule}
            className="inline-flex items-center gap-1 rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> {addingRule ? 'Adding...' : `Add${newRule.days.length > 1 ? ` (${newRule.days.length} days)` : ''}`}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
        <strong>Overlap protection:</strong> You cannot have availability at two different locations at the same time. The system will prevent overlapping time blocks.
      </div>

      {/* Blocked Dates */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Blocked Dates</h3>
          <p className="text-xs text-gray-500 mt-0.5">Block specific dates when you are unavailable (holidays, time off, etc.). Customers cannot book on blocked dates.</p>
        </div>

        {blockedDates.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {blockedDates.map((bd) => (
              <span key={bd.id} className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-medium text-red-700">
                {new Date(bd.blocked_date + 'T12:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                {bd.reason && <span className="text-red-400">({bd.reason})</span>}
                <button
                  type="button"
                  onClick={async () => {
                    await fetch(`/api/vendor/availability?id=${bd.id}&type=blocked_date`, { method: 'DELETE' });
                    setBlockedDates((prev) => prev.filter((d) => d.id !== bd.id));
                  }}
                  className="text-red-300 hover:text-red-600"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400">No dates blocked.</p>
        )}

        <div className="flex items-end gap-3 border-t border-gray-200 pt-4 flex-wrap">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Start Date</label>
            <input
              type="date"
              value={newBlockDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => { setNewBlockDate(e.target.value); if (!newBlockEndDate) setNewBlockEndDate(e.target.value); }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">End Date (optional)</label>
            <input
              type="date"
              value={newBlockEndDate}
              min={newBlockDate || new Date().toISOString().split('T')[0]}
              onChange={(e) => setNewBlockEndDate(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="mb-1 block text-xs text-gray-500">Reason (optional)</label>
            <input
              type="text"
              value={newBlockReason}
              onChange={(e) => setNewBlockReason(e.target.value)}
              placeholder="e.g. Vacation, Holiday"
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={async () => {
              if (!newBlockDate) return;
              const dates: string[] = [];
              const start = new Date(newBlockDate + 'T12:00:00');
              const end = newBlockEndDate ? new Date(newBlockEndDate + 'T12:00:00') : start;
              for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                dates.push(d.toISOString().split('T')[0]);
              }
              const res = await fetch('/api/vendor/availability', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'blocked_date', dates, reason: newBlockReason }),
              });
              if (res.ok) {
                const data = await res.json();
                setBlockedDates((prev) => [...prev, ...data].sort((a, b) => a.blocked_date.localeCompare(b.blocked_date)));
                setNewBlockDate('');
                setNewBlockEndDate('');
                setNewBlockReason('');
              }
            }}
            className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            <Plus className="h-4 w-4" /> Block
          </button>
        </div>
      </div>

      {/* Custom Time Slots */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Custom Time Slots</h3>
          <p className="text-xs text-gray-500 mt-0.5">Add extra time slots on specific dates (e.g. extended hours, special availability). These are added on top of your regular schedule.</p>
        </div>

        {customTimes.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {customTimes.map((ct) => (
              <span key={ct.id} className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs font-medium text-green-700">
                {new Date(ct.custom_date + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })}
                {' '}{ct.start_time.slice(0, 5)} – {ct.end_time.slice(0, 5)}
                {ct.reason && <span className="text-green-500">({ct.reason})</span>}
                <button
                  type="button"
                  onClick={async () => {
                    await fetch(`/api/vendor/availability?id=${ct.id}&type=custom_time`, { method: 'DELETE' });
                    setCustomTimes((prev) => prev.filter((t) => t.id !== ct.id));
                  }}
                  className="text-green-300 hover:text-red-500"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400">No custom time slots set.</p>
        )}

        <div className="flex items-end gap-3 border-t border-gray-200 pt-4 flex-wrap">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Date</label>
            <input
              type="date"
              value={newCustomDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setNewCustomDate(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Start</label>
            <input
              type="time"
              value={newCustomStart}
              onChange={(e) => setNewCustomStart(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">End</label>
            <input
              type="time"
              value={newCustomEnd}
              onChange={(e) => setNewCustomEnd(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="mb-1 block text-xs text-gray-500">Reason (optional)</label>
            <input
              type="text"
              value={newCustomReason}
              onChange={(e) => setNewCustomReason(e.target.value)}
              placeholder="e.g. Extended hours, Special request"
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <button
            type="button"
            disabled={!newCustomDate || !newCustomStart || !newCustomEnd}
            onClick={async () => {
              const res = await fetch('/api/vendor/availability', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'custom_time',
                  custom_date: newCustomDate,
                  start_time: newCustomStart,
                  end_time: newCustomEnd,
                  reason: newCustomReason,
                }),
              });
              if (res.ok) {
                const data = await res.json();
                setCustomTimes((prev) => [...prev, data].sort((a, b) => a.custom_date.localeCompare(b.custom_date)));
                setNewCustomDate('');
                setNewCustomReason('');
              }
            }}
            className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Add Time
          </button>
        </div>
      </div>
    </div>
  );
}
