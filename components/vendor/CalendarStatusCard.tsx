'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, CheckCircle2, AlertTriangle, XCircle, ChevronRight } from 'lucide-react';
import {
  CalendarConnectionView,
  PROVIDER_NAMES,
  connectionHealth,
  formatLastSync,
  startOAuthConnect,
} from '@/lib/calendar-ui';

/** Dashboard card: calendar connection status with a one-tap Connect / Reconnect. */
export default function CalendarStatusCard() {
  const [connections, setConnections] = useState<CalendarConnectionView[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/calendar/connections')
      .then((r) => (r.ok ? r.json() : { connections: [] }))
      .then((d) => setConnections(d.connections ?? []))
      .catch(() => setConnections([]));
  }, []);

  async function connect(provider: 'google' | 'microsoft') {
    setBusy(true);
    setError('');
    const err = await startOAuthConnect(provider);
    if (err) {
      setError(err);
      setBusy(false);
    }
  }

  if (connections === null) return null;

  const btn = 'inline-flex min-h-[44px] items-center justify-center rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50';

  if (connections.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4" data-testid="calendar-status-card" data-status="not_connected">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
            <Calendar className="h-5 w-5 text-gray-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900">Calendar not connected</p>
            <p className="text-xs text-gray-500">Connect your calendar so busy times block bookings and new bookings show up in it.</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button onClick={() => connect('microsoft')} disabled={busy} className={`${btn} bg-navy text-white hover:bg-navy/90`}>Connect Outlook</button>
          <button onClick={() => connect('google')} disabled={busy} className={`${btn} border border-gray-300 bg-white text-gray-800 hover:bg-gray-50`}>Connect Google</button>
          <Link href="/vendor/calendar" className={`${btn} border border-gray-300 bg-white text-gray-800 hover:bg-gray-50`}>Apple &amp; more</Link>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  // Show the connection that needs the most attention
  const rank = { needs_reconnect: 0, config_error: 1, stale: 2, paused: 3, ok: 4 } as const;
  const sorted = [...connections].sort((a, b) => rank[connectionHealth(a)] - rank[connectionHealth(b)]);
  const conn = sorted[0];
  const health = connectionHealth(conn);
  const name = PROVIDER_NAMES[conn.provider] || conn.provider;
  const oauth = conn.provider === 'google' || conn.provider === 'microsoft';

  const view = {
    ok: { tone: 'border-green-200 bg-green-50', icon: <CheckCircle2 className="h-5 w-5 text-green-600" />, title: `${name} connected` },
    paused: { tone: 'border-gray-200 bg-white', icon: <Calendar className="h-5 w-5 text-gray-500" />, title: `${name} sync is turned off` },
    stale: { tone: 'border-amber-200 bg-amber-50', icon: <AlertTriangle className="h-5 w-5 text-amber-600" />, title: `${name} sync delayed` },
    config_error: { tone: 'border-amber-200 bg-amber-50', icon: <AlertTriangle className="h-5 w-5 text-amber-600" />, title: `${name} sync paused` },
    needs_reconnect: { tone: 'border-red-200 bg-red-50', icon: <XCircle className="h-5 w-5 text-red-600" />, title: `Reconnect ${name}` },
  }[health];

  return (
    <div className={`rounded-lg border p-4 ${view.tone}`} data-testid="calendar-status-card" data-status={health}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white">{view.icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900">{view.title}</p>
          <p className="text-xs text-gray-600">
            {health === 'needs_reconnect' && 'Your calendar connection stopped working. Bookings are not being added and busy times are not blocking slots.'}
            {health === 'config_error' && 'A problem on our side is stopping calendar sync. Our team has been notified — no action needed.'}
            {(health === 'ok' || health === 'stale' || health === 'paused') && <>Last synced: {formatLastSync(conn.last_synced_at)}</>}
          </p>
          {connections.length > 1 && <p className="mt-0.5 text-xs text-gray-500">{connections.length} calendars connected</p>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {health === 'needs_reconnect' && oauth && (
          <button onClick={() => connect(conn.provider as 'google' | 'microsoft')} disabled={busy} className={`${btn} bg-red-600 text-white hover:bg-red-700`}>
            Reconnect {name}
          </button>
        )}
        <Link href="/vendor/calendar" className={`${btn} gap-1 border border-gray-300 bg-white text-gray-800 hover:bg-gray-50`}>
          Manage calendar <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
