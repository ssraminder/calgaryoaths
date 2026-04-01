'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import DataTable, { type Column } from '@/components/admin/DataTable';

type Commissioner = {
  id: string;
  name: string;
  title: string;
  location: string;
  email: string;
  phone: string;
  active: boolean;
  booking_fee_cents: number | null;
  sort_order: number;
};

type Application = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  city: string;
  credential_types: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
};

const commissionerColumns: Column<Commissioner>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'title', header: 'Title' },
  { key: 'location', header: 'Location', sortable: true },
  { key: 'email', header: 'Email' },
  { key: 'phone', header: 'Phone' },
  {
    key: 'booking_fee_cents',
    header: 'Fee',
    render: (r) => r.booking_fee_cents != null ? `$${(r.booking_fee_cents / 100).toFixed(0)}` : '—',
  },
  {
    key: 'active',
    header: 'Status',
    render: (r) => (
      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${r.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
        {r.active ? 'Active' : 'Inactive'}
      </span>
    ),
  },
];

const APP_STATUSES = ['new', 'contacted', 'approved', 'declined'];

const applicationColumns: Column<Application>[] = [
  { key: 'full_name', header: 'Name', sortable: true },
  { key: 'email', header: 'Email' },
  { key: 'phone', header: 'Phone' },
  { key: 'city', header: 'City', sortable: true },
  { key: 'credential_types', header: 'Credentials' },
  {
    key: 'status',
    header: 'Status',
    render: (r) => {
      const colors: Record<string, string> = {
        new: 'bg-blue-100 text-blue-800',
        contacted: 'bg-yellow-100 text-yellow-800',
        approved: 'bg-green-100 text-green-800',
        declined: 'bg-red-100 text-red-800',
      };
      return (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colors[r.status] || 'bg-gray-100 text-gray-600'}`}>
          {r.status}
        </span>
      );
    },
  },
  {
    key: 'created_at',
    header: 'Applied',
    sortable: true,
    render: (r) => new Date(r.created_at).toLocaleDateString('en-CA', { timeZone: 'America/Edmonton' }),
  },
];

export default function VendorsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'commissioners' | 'applications'>('commissioners');
  const [commissioners, setCommissioners] = useState<Commissioner[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [appStatusFilter, setAppStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Selected application for detail
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [appNotes, setAppNotes] = useState('');
  const [appStatus, setAppStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tab === 'commissioners') {
      setLoading(true);
      fetch('/api/admin/vendors')
        .then((r) => r.json())
        .then((d) => { setCommissioners(d); setLoading(false); })
        .catch(() => setLoading(false));
    } else {
      setLoading(true);
      const params = appStatusFilter ? `?status=${appStatusFilter}` : '';
      fetch(`/api/admin/applications${params}`)
        .then((r) => r.json())
        .then((d) => { setApplications(d); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [tab, appStatusFilter]);

  async function saveApplication() {
    if (!selectedApp) return;
    setSaving(true);
    await fetch(`/api/admin/applications/${selectedApp.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: appStatus, admin_notes: appNotes }),
    });
    setSelectedApp(null);
    setSaving(false);
    // Refresh
    const params = appStatusFilter ? `?status=${appStatusFilter}` : '';
    const res = await fetch(`/api/admin/applications${params}`);
    setApplications(await res.json());
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Vendors</h1>
        {tab === 'commissioners' && (
          <button
            onClick={() => router.push('/admin/vendors/new')}
            className="inline-flex items-center gap-1.5 rounded-md bg-navy px-3 py-2 text-sm font-medium text-white hover:bg-navy/90"
          >
            <Plus className="h-4 w-4" />
            Add Commissioner
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setTab('commissioners')}
          className={`px-4 py-2 text-sm font-medium ${tab === 'commissioners' ? 'border-b-2 border-navy text-navy' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Commissioners
        </button>
        <button
          onClick={() => setTab('applications')}
          className={`px-4 py-2 text-sm font-medium ${tab === 'applications' ? 'border-b-2 border-navy text-navy' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Partner Applications
        </button>
      </div>

      {tab === 'applications' && (
        <div className="flex gap-2">
          <button
            onClick={() => setAppStatusFilter('')}
            className={`rounded-full px-3 py-1 text-xs font-medium ${!appStatusFilter ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            All
          </button>
          {APP_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setAppStatusFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${appStatusFilter === s ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-navy border-t-transparent" />
        </div>
      ) : tab === 'commissioners' ? (
        <DataTable
          columns={commissionerColumns}
          data={commissioners}
          onRowClick={(r) => router.push(`/admin/vendors/${r.id}`)}
        />
      ) : (
        <DataTable
          columns={applicationColumns}
          data={applications}
          onRowClick={(r) => {
            setSelectedApp(r);
            setAppNotes(r.admin_notes || '');
            setAppStatus(r.status);
          }}
        />
      )}

      {/* Application detail modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
            <h3 className="text-lg font-medium text-gray-900">{selectedApp.full_name}</h3>
            <p className="text-sm text-gray-500">{selectedApp.email} · {selectedApp.phone}</p>

            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">City</dt><dd>{selectedApp.city}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Credentials</dt><dd>{selectedApp.credential_types}</dd></div>
            </dl>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
              <select
                value={appStatus}
                onChange={(e) => setAppStatus(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {APP_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">Admin Notes</label>
              <textarea
                rows={3}
                value={appNotes}
                onChange={(e) => setAppNotes(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setSelectedApp(null)} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={saveApplication} disabled={saving} className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
