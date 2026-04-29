import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Set pathname header so the root layout can detect dashboard routes server-side.
  // Must be on request headers (not response) so server components reading headers() see it.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', pathname);
  const res = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Only protect /admin and /vendor routes (except login/forgot-password pages)
  const isProtectedRoute =
    (pathname.startsWith('/admin') || pathname.startsWith('/vendor')) &&
    pathname !== '/admin/login' &&
    pathname !== '/vendor/login' &&
    pathname !== '/vendor/forgot-password';

  if (!isProtectedRoute) {
    return res;
  }

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
  matcher: [
    /*
     * Match all routes except static files and Next.js internals.
     * This lets us set x-pathname for the root layout on every request.
     */
    '/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|manifest\\.json|icons/).*)',
  ],
};
