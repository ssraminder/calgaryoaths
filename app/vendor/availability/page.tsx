'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, MapPin } from 'lucide-react';

type Location = { id: string; name: string; address: string };
type Rule = { id: string; day_of_week: number; start_time: string; end_time: string; location_id: string; location?: { id: string; name: string } };
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function VendorAvailabilityPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [newRule, setNewRule] = useState({ day_of_week: 1, start_time: '09:00', end_time: '12:00', location_id: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/vendor/availability').then((r) => r.json()).then((d) => {
      setRules(d.rules ?? []);
      setLocations(d.locations ?? []);
      if (d.locations?.length > 0) {
        setSelectedLocation(d.locations[0].id);
        setNewRule((prev) => ({ ...prev, location_id: d.locations[0].id }));
      }
      setLoading(false);
    });
  }, []);

  async function addRule() {
    setError('');
    const res = await fetch('/api/vendor/availability', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRule),
    });
    if (res.ok) {
      const rule = await res.json();
      setRules((prev) => [...prev, rule]);
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to add rule');
    }
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
        <div className="flex flex-wrap items-end gap-3">
          {locations.length > 1 && (
            <div>
              <label className="mb-1 block text-xs text-gray-500">Location</label>
              <select value={newRule.location_id} onChange={(e) => setNewRule({ ...newRule, location_id: e.target.value })} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm">
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs text-gray-500">Day</label>
            <select value={newRule.day_of_week} onChange={(e) => setNewRule({ ...newRule, day_of_week: Number(e.target.value) })} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm">
              {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Start</label>
            <input type="time" value={newRule.start_time} onChange={(e) => setNewRule({ ...newRule, start_time: e.target.value })} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">End</label>
            <input type="time" value={newRule.end_time} onChange={(e) => setNewRule({ ...newRule, end_time: e.target.value })} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
          </div>
          <button onClick={addRule} className="inline-flex items-center gap-1 rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-white hover:bg-navy/90">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
        <strong>Overlap protection:</strong> You cannot have availability at two different locations at the same time. The system will prevent overlapping time blocks.
      </div>
    </div>
  );
}
