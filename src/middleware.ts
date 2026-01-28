import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/api/auth'];
  const isPublicRoute = publicRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  );

  // API routes that require authentication
  const isApiRoute = nextUrl.pathname.startsWith('/api');
  const isAuthApiRoute = nextUrl.pathname.startsWith('/api/auth');

  // Allow public routes
  if (isPublicRoute) {
    // Redirect logged-in users away from login page
    if (isLoggedIn && nextUrl.pathname === '/login') {
      return NextResponse.redirect(new URL('/brief', nextUrl));
    }
    return NextResponse.next();
  }

  // Protect API routes (except auth routes)
  if (isApiRoute && !isAuthApiRoute && !isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Protect dashboard routes
  if (!isLoggedIn) {
    const callbackUrl = encodeURIComponent(nextUrl.pathname);
    return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Match all routes except static files and _next
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
