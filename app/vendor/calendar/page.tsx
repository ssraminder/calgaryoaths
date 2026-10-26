'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar, Check, RefreshCw, ExternalLink, AlertTriangle, XCircle, Unplug } from 'lucide-react';
import {
  CalendarConnectionView as Connection,
  connectionHealth,
  formatLastSync,
  oauthErrorMessage,
  startOAuthConnect,
} from '@/lib/calendar-ui';

const PROVIDER_LABELS: Record<string, { name: string; short: string; color: string; bg: string }> = {
  google: { name: 'Google Calendar', short: 'Google Calendar', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  microsoft: { name: 'Outlook / Microsoft 365', short: 'Outlook', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
  apple: { name: 'Apple Calendar (iCloud)', short: 'Apple Calendar', color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
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
    if (err) setError(oauthErrorMessage(err));
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

  async function connectProvider(provider: 'google' | 'microsoft') {
    setError('');
    const err = await startOAuthConnect(provider);
    if (err) setError(err);
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

  async function toggleSetting(connectionId: string, field: 'sync_enabled' | 'push_bookings' | 'pull_busy_times', value: boolean) {
    setError('');
    setConnections((prev) => prev.map((c) => (c.id === connectionId ? { ...c, [field]: value } : c)));
    try {
      const res = await fetch('/api/calendar/connections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId, [field]: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update setting');
      if (data.warning) setError(data.warning);
      fetchConnections();
    } catch (e) {
      setConnections((prev) => prev.map((c) => (c.id === connectionId ? { ...c, [field]: !value } : c)));
      setError(e instanceof Error ? e.message : 'Failed to update setting');
    }
  }

  async function syncNow() {
    setSyncing(true);
    setError('');
    try {
      const res = await fetch('/api/calendar/sync?push=true', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Sync failed');
      } else if (data.errors > 0) {
        setError(`Sync finished with ${data.errors} problem(s) — see the calendar status below.`);
      } else {
        const parts = [];
        if (data.totalBlocks > 0) parts.push(`${data.totalBlocks} busy time blocks imported`);
        if (data.pushedBookings > 0) parts.push(`${data.pushedBookings} upcoming booking(s) pushed to calendar`);
        setSuccess(parts.length > 0 ? `Sync complete — ${parts.join(', ')}.` : 'Sync complete — everything is up to date.');
      }
      fetchConnections();
    } catch {
      setError('Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  const connectedProviders = new Set(connections.map((c) => c.provider));
  const needsReconnect = connections.filter((c) => connectionHealth(c) === 'needs_reconnect');
  const configError = connections.filter((c) => connectionHealth(c) === 'config_error');

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">Calendar Integration</h1>
        {connections.length > 0 && (
          <button
            onClick={syncNow}
            disabled={syncing}
            className="flex min-h-[44px] items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
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

      {/* Health banners — a broken connection must never be silent */}
      {needsReconnect.map((conn) => (
        <div key={`reconnect-${conn.id}`} role="alert" data-testid="reconnect-banner" className="rounded-lg border border-red-300 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-red-900">Reconnect {PROVIDER_LABELS[conn.provider].short}</p>
              <p className="mt-1 text-sm text-red-800">
                Your {PROVIDER_LABELS[conn.provider].short} connection stopped working. New bookings aren&apos;t being added to your
                calendar and your busy times aren&apos;t blocking booking slots.
              </p>
              {conn.provider === 'apple' ? (
                <button onClick={() => setShowAppleForm(true)} className="mt-3 min-h-[44px] rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                  Re-enter Apple password
                </button>
              ) : (
                <button onClick={() => connectProvider(conn.provider as 'google' | 'microsoft')} className="mt-3 min-h-[44px] rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                  Reconnect {PROVIDER_LABELS[conn.provider].short}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
      {configError.map((conn) => (
        <div key={`config-${conn.id}`} role="status" data-testid="config-error-banner" className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div>
              <p className="font-medium text-amber-900">{PROVIDER_LABELS[conn.provider].short} sync is paused</p>
              <p className="mt-1 text-sm text-amber-800">
                A problem on our side is stopping calendar sync. Our team has been notified and it will resume automatically —
                you don&apos;t need to reconnect. Until then, please check new bookings in the portal.
              </p>
            </div>
          </div>
        </div>
      ))}

      {/* Connected calendars */}
      {connections.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-gray-900">Connected Calendars</h2>
          {connections.map((conn) => {
            const label = PROVIDER_LABELS[conn.provider];
            const health = connectionHealth(conn);
            const badge = {
              ok: { text: 'Connected', cls: 'bg-green-100 text-green-800' },
              stale: { text: 'Sync delayed', cls: 'bg-amber-100 text-amber-800' },
              paused: { text: 'Sync off', cls: 'bg-gray-200 text-gray-700' },
              needs_reconnect: { text: 'Needs reconnect', cls: 'bg-red-100 text-red-800' },
              config_error: { text: 'Paused', cls: 'bg-amber-100 text-amber-800' },
            }[health];
            return (
              <div key={conn.id} className={`rounded-lg border p-4 ${label.bg}`} data-testid={`connection-${conn.provider}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`font-medium ${label.color}`}>{label.name}</p>
                    <p className="truncate text-sm text-gray-600">{conn.display_name || conn.calendar_id}</p>
                    <p className="mt-1 text-xs text-gray-500">Last synced: {formatLastSync(conn.last_synced_at)}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badge.cls}`}>{badge.text}</span>
                </div>
                <div className="mt-3 flex flex-col gap-3 text-sm sm:flex-row sm:flex-wrap sm:gap-4">
                  <label className="flex min-h-[32px] cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={conn.sync_enabled}
                      onChange={(e) => toggleSetting(conn.id, 'sync_enabled', e.target.checked)}
                      className="h-4 w-4 rounded"
                    />
                    <span className="text-gray-700">Sync on</span>
                  </label>
                  <label className={`flex min-h-[32px] cursor-pointer items-center gap-2 ${conn.sync_enabled ? '' : 'opacity-50'}`}>
                    <input
                      type="checkbox"
                      checked={conn.pull_busy_times}
                      disabled={!conn.sync_enabled}
                      onChange={(e) => toggleSetting(conn.id, 'pull_busy_times', e.target.checked)}
                      className="h-4 w-4 rounded"
                    />
                    <span className="text-gray-700">Block busy times</span>
                  </label>
                  <label className={`flex min-h-[32px] cursor-pointer items-center gap-2 ${conn.sync_enabled ? '' : 'opacity-50'}`}>
                    <input
                      type="checkbox"
                      checked={conn.push_bookings}
                      disabled={!conn.sync_enabled}
                      onChange={(e) => toggleSetting(conn.id, 'push_bookings', e.target.checked)}
                      className="h-4 w-4 rounded"
                    />
                    <span className="text-gray-700">Add bookings to calendar</span>
                  </label>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      conn.provider === 'apple' ? setShowAppleForm(true) : connectProvider(conn.provider as 'google' | 'microsoft')
                    }
                    className="flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                  >
                    <RefreshCw className="h-4 w-4" /> Reconnect
                  </button>
                  <button
                    onClick={() => disconnect(conn.id)}
                    className="flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <Unplug className="h-4 w-4" /> Disconnect
                  </button>
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
            className="flex min-h-[64px] w-full items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Connect Google Calendar</p>
              <p className="text-sm text-gray-500">Sign in with Google to sync your calendar</p>
            </div>
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </button>
        )}

        {/* Microsoft */}
        {!connectedProviders.has('microsoft') && (
          <button
            onClick={() => connectProvider('microsoft')}
            className="flex min-h-[64px] w-full items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
              <Calendar className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Connect Outlook / Microsoft 365</p>
              <p className="text-sm text-gray-500">Sign in with Microsoft to sync your calendar</p>
            </div>
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </button>
        )}

        {/* Apple */}
        {!connectedProviders.has('apple') && !showAppleForm && (
          <button
            onClick={() => setShowAppleForm(true)}
            className="flex min-h-[64px] w-full items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              <Calendar className="h-5 w-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Connect Apple Calendar (iCloud)</p>
              <p className="text-sm text-gray-500">Connect with your Apple ID and app-specific password</p>
            </div>
          </button>
        )}

        {/* Apple CalDAV form */}
        {showAppleForm && (
          <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-gray-900">{connectedProviders.has('apple') ? 'Reconnect' : 'Connect'} Apple Calendar</p>
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
          <li>Busy times sync automatically every 15 minutes. You can also tap &quot;Sync Now&quot; for an immediate refresh.</li>
          <li>If a connection stops working you&apos;ll get an email and a notification, and a Reconnect button will appear here.</li>
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
