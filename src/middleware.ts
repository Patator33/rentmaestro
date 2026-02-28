import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple Basic Auth middleware
// Set AUTH_USERNAME and AUTH_PASSWORD in .env to enable authentication
// If not set, the app is accessible without authentication

export function middleware(request: NextRequest) {
    const authUser = process.env.AUTH_USERNAME;
    const authPass = process.env.AUTH_PASSWORD;

    // Skip auth if no credentials configured
    if (!authUser || !authPass) {
        return NextResponse.next();
    }

    // Skip auth for static assets and _next
    if (
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.startsWith('/favicon') ||
        request.nextUrl.pathname.startsWith('/icon')
    ) {
        return NextResponse.next();
    }

    const authHeader = request.headers.get('authorization');

    if (authHeader) {
        const [scheme, encoded] = authHeader.split(' ');

        if (scheme === 'Basic' && encoded) {
            const decoded = atob(encoded);
            const [user, pass] = decoded.split(':');

            if (user === authUser && pass === authPass) {
                return NextResponse.next();
            }
        }
    }

    return new NextResponse('Accès non autorisé', {
        status: 401,
        headers: {
            'WWW-Authenticate': 'Basic realm="Rentmaestro"',
        },
    });
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|icon).*)'],
};
