'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar, Check, Trash2, RefreshCw, ExternalLink } from 'lucide-react';

type Connection = {
  id: string;
  provider: 'google' | 'microsoft' | 'apple';
  calendar_id: string;
  display_name: string | null;
  sync_enabled: boolean;
  push_bookings: boolean;
  pull_busy_times: boolean;
  last_synced_at: string | null;
  created_at: string;
};

const PROVIDER_LABELS: Record<string, { name: string; color: string; bg: string }> = {
  google: { name: 'Google Calendar', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  microsoft: { name: 'Outlook / Microsoft 365', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
  apple: { name: 'Apple Calendar (iCloud)', color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
};

export default function VendorCalendarPage() {
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Apple CalDAV form
  const [showAppleForm, setShowAppleForm] = useState(false);
  const [appleId, setAppleId] = useState('');
  const [applePassword, setApplePassword] = useState('');
  const [appleConnecting, setAppleConnecting] = useState(false);

  useEffect(() => {
    const connected = searchParams.get('connected');
    const err = searchParams.get('error');
    if (connected) setSuccess(`${PROVIDER_LABELS[connected]?.name || connected} connected successfully.`);
    if (err) setError(`Connection failed: ${err.replace(/_/g, ' ')}`);
    fetchConnections();
  }, [searchParams]);

  async function fetchConnections() {
    try {
      const res = await fetch('/api/calendar/connections');
      const data = await res.json();
      setConnections(data.connections ?? []);
    } catch {
      setError('Failed to load calendar connections');
    } finally {
      setLoading(false);
    }
  }

  async function connectProvider(provider: string) {
    setError('');
    try {
      const res = await fetch('/api/calendar/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        setError(data.error);
      }
    } catch {
      setError('Failed to start connection');
    }
  }

  async function connectApple() {
    setError('');
    setAppleConnecting(true);
    try {
      const res = await fetch('/api/calendar/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'apple',
          username: appleId,
          appPassword: applePassword,
        }),
      });
      const data = await res.json();
      if (data.connected) {
        setSuccess(`Apple Calendar connected: ${data.calendarName}`);
        setShowAppleForm(false);
        setAppleId('');
        setApplePassword('');
        fetchConnections();
      } else {
        setError(data.error || 'Failed to connect Apple Calendar');
      }
    } catch {
      setError('Failed to connect Apple Calendar');
    } finally {
      setAppleConnecting(false);
    }
  }

  async function disconnect(connectionId: string) {
    if (!confirm('Disconnect this calendar? Synced busy times will be removed.')) return;
    setError('');
    try {
      await fetch('/api/calendar/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      });
      setConnections((prev) => prev.filter((c) => c.id !== connectionId));
      setSuccess('Calendar disconnected');
    } catch {
      setError('Failed to disconnect');
    }
  }

  async function toggleSetting(connectionId: string, field: string, value: boolean) {
    try {
      await fetch('/api/calendar/connections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId, [field]: value }),
      });
      setConnections((prev) =>
        prev.map((c) => (c.id === connectionId ? { ...c, [field]: value } : c))
      );
    } catch {
      setError('Failed to update setting');
    }
  }

  async function syncNow() {
    setSyncing(true);
    setError('');
    try {
      const res = await fetch('/api/calendar/sync', { method: 'POST' });
      const data = await res.json();
      if (data.errors > 0) {
        setError(`Synced with ${data.errors} error(s). ${data.totalBlocks} busy blocks imported.`);
      } else {
        setSuccess(`Sync complete — ${data.totalBlocks} busy time blocks imported from ${data.synced} calendar(s).`);
      }
      fetchConnections();
    } catch {
      setError('Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  const connectedProviders = new Set(connections.map((c) => c.provider));

  if (loading) {
    return (
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Calendar Integration</h1>
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-navy border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Calendar Integration</h1>
        {connections.length > 0 && (
          <button
            onClick={syncNow}
            disabled={syncing}
            className="flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        )}
      </div>

      <p className="text-sm text-gray-500">
        Connect your calendar to automatically block time slots when you're busy and
        add confirmed bookings to your calendar.
      </p>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <Check className="mr-1 inline h-4 w-4" />
          {success}
          <button onClick={() => setSuccess('')} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}

      {/* Connected calendars */}
      {connections.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-gray-900">Connected Calendars</h2>
          {connections.map((conn) => {
            const label = PROVIDER_LABELS[conn.provider];
            return (
              <div key={conn.id} className={`rounded-lg border p-4 ${label.bg}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`font-medium ${label.color}`}>{label.name}</p>
                    <p className="text-sm text-gray-600">{conn.display_name || conn.calendar_id}</p>
                    {conn.last_synced_at && (
                      <p className="text-xs text-gray-400 mt-1">
                        Last synced: {new Date(conn.last_synced_at).toLocaleString('en-CA', { timeZone: 'America/Edmonton' })}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => disconnect(conn.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Disconnect"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={conn.pull_busy_times}
                      onChange={(e) => toggleSetting(conn.id, 'pull_busy_times', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-gray-700">Block busy times</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={conn.push_bookings}
                      onChange={(e) => toggleSetting(conn.id, 'push_bookings', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-gray-700">Add bookings to calendar</span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Connect new calendar */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium text-gray-900">
          {connections.length > 0 ? 'Connect Another Calendar' : 'Connect a Calendar'}
        </h2>

        {/* Google */}
        {!connectedProviders.has('google') && (
          <button
            onClick={() => connectProvider('google')}
            className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Google Calendar</p>
              <p className="text-sm text-gray-500">Sign in with Google to sync your calendar</p>
            </div>
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </button>
        )}

        {/* Microsoft */}
        {!connectedProviders.has('microsoft') && (
          <button
            onClick={() => connectProvider('microsoft')}
            className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
              <Calendar className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Outlook / Microsoft 365</p>
              <p className="text-sm text-gray-500">Sign in with Microsoft to sync your calendar</p>
            </div>
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </button>
        )}

        {/* Apple */}
        {!connectedProviders.has('apple') && !showAppleForm && (
          <button
            onClick={() => setShowAppleForm(true)}
            className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              <Calendar className="h-5 w-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Apple Calendar (iCloud)</p>
              <p className="text-sm text-gray-500">Connect with your Apple ID and app-specific password</p>
            </div>
          </button>
        )}

        {/* Apple CalDAV form */}
        {showAppleForm && !connectedProviders.has('apple') && (
          <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-gray-900">Connect Apple Calendar</p>
              <button onClick={() => setShowAppleForm(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <p className="font-medium mb-1">App-specific password required</p>
              <p>Apple Calendar requires an app-specific password (not your regular Apple ID password).
                Go to <strong>appleid.apple.com</strong> &rarr; Sign-In and Security &rarr; App-Specific Passwords to generate one.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apple ID (email)</label>
              <input
                type="email"
                value={appleId}
                onChange={(e) => setAppleId(e.target.value)}
                placeholder="you@icloud.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">App-Specific Password</label>
              <input
                type="password"
                value={applePassword}
                onChange={(e) => setApplePassword(e.target.value)}
                placeholder="xxxx-xxxx-xxxx-xxxx"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>

            <button
              onClick={connectApple}
              disabled={appleConnecting || !appleId || !applePassword}
              className="w-full rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
            >
              {appleConnecting ? 'Connecting...' : 'Connect Apple Calendar'}
            </button>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 space-y-2">
        <p className="text-sm font-medium text-blue-900">How calendar sync works</p>
        <ul className="text-sm text-blue-800 space-y-1 list-disc pl-4">
          <li><strong>Block busy times (pull):</strong> Your existing calendar events will automatically block matching time slots so customers can't double-book you.</li>
          <li><strong>Add bookings (push):</strong> When a customer books and pays, the appointment is automatically added to your connected calendar.</li>
          <li>Busy times sync automatically. You can also tap "Sync Now" for an immediate refresh.</li>
        </ul>
      </div>

      {connections.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm text-gray-600">
            <strong>No calendars connected yet.</strong> In the meantime, manage your availability manually on the{' '}
            <a href="/vendor/availability" className="text-navy underline">Availability</a> page.
          </p>
        </div>
      )}
    </div>
  );
}
