import { NextRequest, NextResponse } from 'next/server';
import { getCronofyAuthUrl } from '@/lib/cronofy';

export async function GET(req: NextRequest) {
  const commissionerId = req.nextUrl.searchParams.get('commissionerId');
  if (!commissionerId) {
    return NextResponse.json({ error: 'Missing commissionerId' }, { status: 400 });
  }

  const authUrl = getCronofyAuthUrl(commissionerId);
  return NextResponse.redirect(authUrl);
}
