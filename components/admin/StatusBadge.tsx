const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
  pending_review: { label: 'Pending Review', className: 'bg-orange-100 text-orange-800' },
  pending_scheduling: { label: 'Pending Scheduling', className: 'bg-blue-100 text-blue-800' },
  pending_payment: { label: 'Pending Payment', className: 'bg-purple-100 text-purple-800' },
  paid: { label: 'Paid', className: 'bg-green-100 text-green-800' },
  confirmed: { label: 'Confirmed', className: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800' },
  no_show: { label: 'No Show', className: 'bg-gray-100 text-gray-800' },
  completed: { label: 'Completed', className: 'bg-teal-100 text-teal-800' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800' },
};

export default function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-600' };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
