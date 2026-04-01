'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

type AnalyticsData = {
  daily: { date: string; count: number; revenue: number }[];
  byService: { name: string; value: number }[];
  byCommissioner: { name: string; value: number }[];
  funnel: { total: number; paid: number; confirmed: number };
};

const COLORS = ['#1B3A5C', '#C8922A', '#1D9E75', '#6B6B68', '#E8B55A', '#3b82f6', '#ef4444'];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [commissioner, setCommissioner] = useState('');
  const [service, setService] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ dateFrom, dateTo });
    if (commissioner) params.set('commissioner', commissioner);
    if (service) params.set('service', service);

    const res = await fetch(`/api/admin/analytics?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [dateFrom, dateTo, commissioner, service]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs text-gray-500">From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Commissioner</label>
          <input type="text" placeholder="All" value={commissioner} onChange={(e) => setCommissioner(e.target.value)} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Service</label>
          <input type="text" placeholder="All" value={service} onChange={(e) => setService(e.target.value)} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-4 font-medium text-gray-900">Conversion Funnel</h2>
        <div className="flex gap-8">
          {[
            { label: 'Created', value: data.funnel.total },
            { label: 'Paid', value: data.funnel.paid },
            { label: 'Confirmed', value: data.funnel.confirmed },
          ].map((step, i) => (
            <div key={i} className="text-center">
              <p className="text-3xl font-semibold text-navy">{step.value}</p>
              <p className="text-sm text-gray-500">{step.label}</p>
              {i < 2 && data.funnel.total > 0 && (
                <p className="mt-1 text-xs text-gray-400">
                  {((step.value / data.funnel.total) * 100).toFixed(0)}%
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Bookings over time */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-4 font-medium text-gray-900">Bookings Over Time</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#1B3A5C" name="Bookings" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue over time */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-4 font-medium text-gray-900">Revenue Over Time</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v: number) => `$${(v / 100).toFixed(0)}`} />
              <Tooltip formatter={(v) => `$${(Number(v) / 100).toFixed(2)}`} />
              <Line type="monotone" dataKey="revenue" stroke="#C8922A" name="Revenue" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* By service */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-4 font-medium text-gray-900">Bookings by Service</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={data.byService} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {data.byService.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* By commissioner */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-4 font-medium text-gray-900">Bookings by Commissioner</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={data.byCommissioner} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {data.byCommissioner.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
