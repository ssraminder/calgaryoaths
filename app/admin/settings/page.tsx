'use client';

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';

type Setting = {
  key: string;
  value: string;
  description: string | null;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => { setSettings(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function updateValue(key: string, value: string) {
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, value } : s))
    );
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    const body: Record<string, string> = {};
    for (const s of settings) {
      body[s.key] = s.value;
    }

    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-navy border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save All'}
        </button>
      </div>

      <div className="space-y-3">
        {settings.map((s) => (
          <div key={s.key} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <label htmlFor={s.key} className="text-sm font-medium text-gray-900">
                {s.key}
              </label>
            </div>
            {s.description && (
              <p className="mt-0.5 text-xs text-gray-400">{s.description}</p>
            )}
            <input
              id={s.key}
              type="text"
              value={s.value || ''}
              onChange={(e) => updateValue(s.key, e.target.value)}
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            />
          </div>
        ))}
      </div>

      {settings.length === 0 && (
        <p className="text-center text-sm text-gray-500">No settings found.</p>
      )}
    </div>
  );
}
