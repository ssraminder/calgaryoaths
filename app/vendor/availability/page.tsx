'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

type Rule = { id: string; day_of_week: number; start_time: string; end_time: string };
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function VendorAvailabilityPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRule, setNewRule] = useState({ day_of_week: 1, start_time: '09:00', end_time: '12:00' });

  useEffect(() => {
    fetch('/api/vendor/availability').then((r) => r.json()).then((d) => { setRules(d ?? []); setLoading(false); });
  }, []);

  async function addRule() {
    const res = await fetch('/api/vendor/availability', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newRule),
    });
    if (res.ok) { const rule = await res.json(); setRules((prev) => [...prev, rule]); }
  }

  async function deleteRule(id: string) {
    await fetch(`/api/vendor/availability?id=${id}`, { method: 'DELETE' });
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  if (loading) return <div className="flex h-32 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-4 border-navy border-t-transparent" /></div>;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Availability</h1>
      <p className="text-sm text-gray-500">Set when customers can book appointments with you. Add multiple time blocks per day.</p>

      <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-5">
        {DAYS.map((dayName, dayIdx) => {
          const dayRules = rules.filter((r) => r.day_of_week === dayIdx);
          return (
            <div key={dayIdx} className="flex items-center gap-3 py-1 text-sm">
              <span className="w-24 font-medium text-gray-700">{dayName}</span>
              <div className="flex flex-wrap gap-2">
                {dayRules.length === 0 && <span className="text-xs text-gray-300">Closed</span>}
                {dayRules.map((r) => (
                  <span key={r.id} className="inline-flex items-center gap-1 rounded-full bg-navy/10 px-3 py-1 text-xs font-medium text-navy">
                    {r.start_time.slice(0, 5)} – {r.end_time.slice(0, 5)}
                    <button onClick={() => deleteRule(r.id)} className="ml-1 text-navy/50 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-medium text-gray-900">Add Time Block</h3>
        <div className="flex items-end gap-3">
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
    </div>
  );
}
