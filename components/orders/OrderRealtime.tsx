'use client';

import { useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface Props {
  orderId: string;
  onChange: () => void;
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function OrderRealtime({ orderId, onChange }: Props) {
  useEffect(() => {
    const channel = supabase
      .channel(`co_orders:${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'co_orders', filter: `id=eq.${orderId}` },
        () => onChange()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, onChange]);

  return null;
}
