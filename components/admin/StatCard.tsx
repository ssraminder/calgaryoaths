import Link from 'next/link';
import { type LucideIcon } from 'lucide-react';

type StatCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  highlight?: boolean;
  href?: string;
};

export default function StatCard({ label, value, icon: Icon, highlight, href }: StatCardProps) {
  const card = (
    <div
      className={`rounded-lg border p-5 ${
        highlight ? 'border-gold bg-gold/5' : 'border-gray-200 bg-white'
      } ${href ? 'active:bg-gray-50' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
        </div>
        <Icon className={`h-8 w-8 ${highlight ? 'text-gold' : 'text-gray-300'}`} />
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="block">{card}</Link>;
  }

  return card;
}
