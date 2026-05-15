'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SignedTermsPrintView from './SignedTermsPrintView';
import type { Order } from '@/lib/orders/types';

interface TermsRecord {
  id: string;
  form_type: string;
  version: string;
  content_md: string;
  effective_from?: string | null;
}

export default function SignedTermsLoader() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [order, setOrder] = useState<Order | null>(null);
  const [terms, setTerms] = useState<TermsRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/orders/${id}/terms`)
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => null);
          setError(j?.error || 'Unable to load terms');
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d) { setOrder(d.order); setTerms(d.terms); }
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading signed terms…</div>;
  if (error || !order || !terms) return <div className="p-6 text-sm text-red-700">{error || 'Not found'}</div>;

  return <SignedTermsPrintView order={order} terms={terms} autoPrint />;
}
