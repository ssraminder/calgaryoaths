import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import CustomerOrderForm from '@/components/orders/CustomerOrderForm';

interface OrderPayload {
  order: {
    order_number: string;
    order_type: 'apostille' | 'notarization';
    total_cents: number;
    subtotal_cents: number;
    tax_cents: number;
    customer_name?: string | null;
    customer_email?: string | null;
    customer_phone?: string | null;
    customer_dob?: string | null;
    customer_address_street?: string | null;
    customer_address_unit?: string | null;
    customer_address_city?: string | null;
    customer_address_province?: string | null;
    customer_address_postal?: string | null;
    customer_address_country?: string | null;
    customer_notes?: string | null;
  };
  items: Array<{ description: string; quantity: number; line_total_cents: number }>;
  terms: { id: string; form_type: string; version: string; content_md: string };
}

export const dynamic = 'force-dynamic';

export default async function CustomerOrderPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { return?: string };
}) {
  const hdrs = headers();
  const host = hdrs.get('x-forwarded-host') || hdrs.get('host');
  const proto = hdrs.get('x-forwarded-proto') || 'https';
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || (host ? `${proto}://${host}` : '');

  const res = await fetch(`${baseUrl}/api/orders/customer/${params.token}`, { cache: 'no-store' });

  if (res.status === 410) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-gray-900">Link expired</h1>
          <p className="mt-2 text-sm text-gray-600">
            This handoff link has expired or has already been used. Please ask the staff member to generate a new link.
          </p>
        </div>
      </div>
    );
  }
  if (!res.ok) notFound();
  const data: OrderPayload = await res.json();

  return (
    <div className="min-h-screen bg-gray-50 py-4">
      <CustomerOrderForm
        token={params.token}
        order={data.order}
        items={data.items}
        terms={data.terms}
        returnUrl={searchParams.return || null}
      />
    </div>
  );
}
