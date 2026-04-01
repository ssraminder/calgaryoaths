'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarCheck, AlertTriangle, DollarSign, TrendingUp } from 'lucide-react';
import StatCard from '@/components/admin/StatCard';
import StatusBadge from '@/components/admin/StatusBadge';
import DataTable, { type Column } from '@/components/admin/DataTable';

type Stats = {
  todayBookings: number;
  pendingReviews: number;
  monthlyRevenue: number;
  monthlyBookings: number;
  recentBookings: Booking[];
};

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

const columns: Column<Booking>[] = [
  {
    key: 'id',
    header: 'ID',
    render: (row) => row.id.slice(0, 8) + '...',
  },
  { key: 'name', header: 'Customer', sortable: true },
  { key: 'service_name', header: 'Service', sortable: true },
  { key: 'commissioner_id', header: 'Commissioner', sortable: true },
  {
    key: 'appointment_datetime',
    header: 'Appointment',
    sortable: true,
    render: (row) =>
      row.appointment_datetime
        ? new Date(row.appointment_datetime).toLocaleString('en-CA', {
            timeZone: 'America/Edmonton',
            dateStyle: 'medium',
            timeStyle: 'short',
          })
        : '—',
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <StatusBadge status={row.status} />,
  },
  {
    key: 'created_at',
    header: 'Created',
    sortable: true,
    render: (row) =>
      new Date(row.created_at).toLocaleDateString('en-CA', {
        timeZone: 'America/Edmonton',
      }),
  },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy border-t-transparent" />
      </div>
    );
  }

  if (!stats) {
    return <p className="text-gray-500">Failed to load dashboard data.</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today's Bookings"
          value={stats.todayBookings}
          icon={CalendarCheck}
        />
        <StatCard
          label="Pending Reviews"
          value={stats.pendingReviews}
          icon={AlertTriangle}
          highlight={stats.pendingReviews > 0}
        />
        <StatCard
          label="Monthly Revenue"
          value={`$${(stats.monthlyRevenue / 100).toFixed(2)}`}
          icon={DollarSign}
        />
        <StatCard
          label="Monthly Bookings"
          value={stats.monthlyBookings}
          icon={TrendingUp}
        />
      </div>

      {/* Pending reviews alert */}
      {stats.pendingReviews > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <p className="text-sm text-orange-800">
            <strong>{stats.pendingReviews}</strong> booking{stats.pendingReviews !== 1 ? 's' : ''} pending
            manual review.
          </p>
          <button
            onClick={() => router.push('/admin/reviews')}
            className="ml-auto rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700"
          >
            Review Now
          </button>
        </div>
      )}

      {/* Recent bookings */}
      <div>
        <h2 className="mb-3 text-lg font-medium text-gray-900">Recent Bookings</h2>
        <DataTable
          columns={columns}
          data={stats.recentBookings}
          onRowClick={(row) => router.push(`/admin/bookings/${row.id}`)}
        />
      </div>
    </div>
  );
}
