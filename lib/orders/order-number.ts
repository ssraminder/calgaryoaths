import { supabaseAdmin } from '@/lib/supabase-server';
import type { OrderType } from './types';

const PREFIX_BY_TYPE: Record<OrderType, string> = {
  apostille: 'APO',
  notarization: 'NOT',
};

export async function generateOrderNumber(orderType: OrderType): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc('next_order_number', { p_type: orderType });
  if (error || data == null) throw error || new Error('next_order_number returned null');
  const n = Number(data);
  const year = new Date().getFullYear();
  return `${PREFIX_BY_TYPE[orderType]}-${year}-${String(n).padStart(4, '0')}`;
}
