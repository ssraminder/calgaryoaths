import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyStaff } from '@/lib/orders/auth';
import { generateHandoffToken, handoffExpiry } from '@/lib/orders/handoff-token';

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const staff = await verifyStaff(req);
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = ctx.params;
  const token = generateHandoffToken();
  const expiresAt = handoffExpiry();

  const { data, error } = await supabaseAdmin
    .from('co_orders')
    .update({
      handoff_token: token,
      handoff_token_expires_at: expiresAt.toISOString(),
      handoff_used_at: null,
      status: 'awaiting_customer',
    })
    .eq('id', id)
    .select('id, order_number, handoff_token, handoff_token_expires_at')
    .single();

  if (error || !data) {
    console.error('Handoff token error', error);
    return NextResponse.json({ error: 'Failed to create handoff token' }, { status: 500 });
  }

  const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || '';
  const url = `${origin}/orders/c/${token}`;

  return NextResponse.json({
    token,
    url,
    expiresAt: data.handoff_token_expires_at,
  });
}

export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
  const staff = await verifyStaff(req);
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = ctx.params;
  const { error } = await supabaseAdmin
    .from('co_orders')
    .update({
      handoff_token: null,
      handoff_token_expires_at: null,
      handoff_used_at: null,
    })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
