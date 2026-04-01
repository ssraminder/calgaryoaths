import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only protect /admin and /vendor routes (except login pages)
  if (
    (!pathname.startsWith('/admin') && !pathname.startsWith('/vendor')) ||
    pathname === '/admin/login' ||
    pathname === '/vendor/login'
  ) {
    return NextResponse.next();
  }

  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = pathname.startsWith('/vendor') ? '/vendor/login' : '/admin/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: ['/admin/:path*', '/vendor/:path*'],
};
