import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { SESSION_OPTIONS, type SessionData } from '@/lib/session';

// Routes that don't require authentication
const PUBLIC_PATHS = [
    '/login',
    '/setup',
    '/api/auth',
    '/portal',
    '/api/portal',
    '/api/verify',
];

function isPublic(pathname: string): boolean {
    return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Always allow static assets
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.startsWith('/icon')
    ) {
        return NextResponse.next();
    }

    // Allow public routes
    if (isPublic(pathname)) {
        return NextResponse.next();
    }

    // Check session
    const res = NextResponse.next();
    const session = await getIronSession<SessionData>(request, res, SESSION_OPTIONS);

    // Not logged in → redirect to login
    if (!session.userId) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('from', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Logged in but TOTP pending → redirect to TOTP verification
    if (session.pendingTotp && pathname !== '/login/totp') {
        return NextResponse.redirect(new URL('/login/totp', request.url));
    }

    return res;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|icon).*)'],
};
