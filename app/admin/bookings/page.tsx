'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Search } from 'lucide-react';
import DataTable, { type Column } from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import Pagination from '@/components/admin/Pagination';

type Booking = {
  id: string;
  name: string;
  email: string;
  service_name: string;
  commissioner_id: string;
  appointment_datetime: string | null;
  status: string;
  amount_paid: number | null;
  created_at: string;
};

const ALL_STATUSES = [
  'pending', 'pending_review', 'pending_scheduling', 'pending_payment',
  'paid', 'confirmed', 'cancelled', 'no_show', 'completed', 'rejected',
];

const columns: Column<Booking>[] = [
  { key: 'id', header: 'ID', render: (r) => r.id.slice(0, 8) + '...' },
  { key: 'name', header: 'Customer', sortable: true },
  { key: 'email', header: 'Email' },
  { key: 'service_name', header: 'Service', sortable: true },
  { key: 'commissioner_id', header: 'Commissioner', sortable: true },
  {
    key: 'appointment_datetime',
    header: 'Appointment',
    sortable: true,
    render: (r) =>
      r.appointment_datetime
        ? new Date(r.appointment_datetime).toLocaleString('en-CA', {
            timeZone: 'America/Edmonton',
            dateStyle: 'medium',
            timeStyle: 'short',
          })
        : '—',
  },
  {
    key: 'status',
    header: 'Status',
    render: (r) => <StatusBadge status={r.status} />,
  },
  {
    key: 'amount_paid',
    header: 'Amount',
    sortable: true,
    render: (r) => (r.amount_paid != null ? `$${(r.amount_paid / 100).toFixed(2)}` : '—'),
  },
  {
    key: 'created_at',
    header: 'Created',
    sortable: true,
    render: (r) =>
      new Date(r.created_at).toLocaleDateString('en-CA', { timeZone: 'America/Edmonton' }),
  },
];

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [commissioner, setCommissioner] = useState('');
  const [service, setService] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (selectedStatuses.length) params.set('status', selectedStatuses.join(','));
    if (commissioner) params.set('commissioner', commissioner);
    if (service) params.set('service', service);
    if (search) params.set('search', search);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);

    const res = await fetch(`/api/admin/bookings?${params}`);
    const data = await res.json();
    setBookings(data.bookings ?? []);
    setTotal(data.total ?? 0);
    setTotalPages(data.totalPages ?? 1);
    setLoading(false);
  }, [page, selectedStatuses, commissioner, service, search, dateFrom, dateTo]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  function handleExport() {
    const params = new URLSearchParams();
    if (selectedStatuses.length) params.set('status', selectedStatuses.join(','));
    if (commissioner) params.set('commissioner', commissioner);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    window.open(`/api/admin/bookings/export?${params}`, '_blank');
  }

  function toggleStatus(s: string) {
    setSelectedStatuses((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Bookings</h1>
        <div className="flex gap-2">
          <span className="text-sm text-gray-500">{total} total</span>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
          />
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap gap-1.5">
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                selectedStatuses.includes(s)
                  ? 'bg-navy text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Date & commissioner filters */}
        <div className="flex flex-wrap gap-3">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            placeholder="From"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            placeholder="To"
          />
          <input
            type="text"
            placeholder="Commissioner ID"
            value={commissioner}
            onChange={(e) => { setCommissioner(e.target.value); setPage(1); }}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
          <input
            type="text"
            placeholder="Service slug"
            value={service}
            onChange={(e) => { setService(e.target.value); setPage(1); }}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-navy border-t-transparent" />
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={bookings}
            onRowClick={(row) => router.push(`/admin/bookings/${row.id}`)}
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
