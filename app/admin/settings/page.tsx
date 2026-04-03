'use client';

import { useEffect, useState } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';

type Setting = {
  key: string;
  value: string;
  description: string | null;
};

/** Settings that should always appear (seeded if missing from DB) */
const REQUIRED_SETTINGS: { key: string; description: string }[] = [
  { key: 'logo_url', description: 'Site logo URL — used in vendor/admin portals (full URL or Supabase storage path)' },
  { key: 'ga4_id', description: 'Google Analytics 4 Measurement ID (G-XXXXXXXXXX)' },
  { key: 'gtm_id', description: 'Google Tag Manager Container ID (GTM-XXXXXXX)' },
  { key: 'google_ads_id', description: 'Google Ads Conversion ID (AW-XXXXXXXXXX)' },
  { key: 'google_ads_booking_label', description: 'Google Ads conversion label for online bookings' },
  { key: 'google_ads_phone_label', description: 'Google Ads conversion label for phone call clicks' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((data: Setting[]) => {
        // Ensure required settings always appear
        const merged = [...data];
        for (const req of REQUIRED_SETTINGS) {
          if (!merged.some((s) => s.key === req.key)) {
            merged.push({ key: req.key, value: '', description: req.description });
          }
        }
        // Add descriptions for required settings that are missing them
        for (const s of merged) {
          const req = REQUIRED_SETTINGS.find((r) => r.key === s.key);
          if (req && !s.description) s.description = req.description;
        }
        merged.sort((a, b) => a.key.localeCompare(b.key));
        setSettings(merged);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function updateValue(key: string, value: string) {
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, value } : s))
    );
    setSaved(false);
  }

  function addSetting() {
    const key = prompt('Setting key (snake_case):');
    if (!key || !key.trim()) return;
    const trimmed = key.trim().toLowerCase().replace(/\s+/g, '_');
    if (settings.some((s) => s.key === trimmed)) {
      alert(`"${trimmed}" already exists.`);
      return;
    }
    setSettings((prev) => [...prev, { key: trimmed, value: '', description: null }].sort((a, b) => a.key.localeCompare(b.key)));
    setSaved(false);
  }

  function removeSetting(key: string) {
    if (REQUIRED_SETTINGS.some((r) => r.key === key)) {
      alert('Cannot remove a required setting. Clear the value instead.');
      return;
    }
    if (!confirm(`Remove "${key}"?`)) return;
    setSettings((prev) => prev.filter((s) => s.key !== key));
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

  // Group settings: analytics first, then the rest
  const analyticsKeys = REQUIRED_SETTINGS.map((r) => r.key);
  const analyticsList = settings.filter((s) => analyticsKeys.includes(s.key));
  const otherList = settings.filter((s) => !analyticsKeys.includes(s.key));

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={addSetting}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save All'}
          </button>
        </div>
      </div>

      {/* Analytics & Tracking */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Analytics & Tracking</h2>
        <div className="space-y-3">
          {analyticsList.map((s) => (
            <SettingRow key={s.key} setting={s} onChange={updateValue} />
          ))}
        </div>
      </div>

      {/* Other Settings */}
      {otherList.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">General</h2>
          <div className="space-y-3">
            {otherList.map((s) => (
              <SettingRow key={s.key} setting={s} onChange={updateValue} onRemove={removeSetting} />
            ))}
          </div>
        </div>
      )}

      {settings.length === 0 && (
        <p className="text-center text-sm text-gray-500">No settings found.</p>
      )}
    </div>
  );
}

function SettingRow({
  setting,
  onChange,
  onRemove,
}: {
  setting: Setting;
  onChange: (key: string, value: string) => void;
  onRemove?: (key: string) => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <label htmlFor={setting.key} className="text-sm font-medium text-gray-900">
          {setting.key}
        </label>
        {onRemove && (
          <button
            onClick={() => onRemove(setting.key)}
            className="text-gray-400 hover:text-red-500 transition-colors"
            title="Remove setting"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {setting.description && (
        <p className="mt-0.5 text-xs text-gray-400">{setting.description}</p>
      )}
      <input
        id={setting.key}
        type="text"
        value={setting.value || ''}
        onChange={(e) => onChange(setting.key, e.target.value)}
        className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
        placeholder={setting.value ? undefined : 'Not set'}
      />
    </div>
  );
}
