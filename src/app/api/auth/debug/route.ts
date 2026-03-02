import { NextRequest, NextResponse } from 'next/server';
import { unsealData } from 'iron-session';
import { SESSION_OPTIONS } from '@/lib/session';

// GET /api/auth/debug — check current session cookie
export async function GET(request: NextRequest) {
    const cookieName = SESSION_OPTIONS.cookieName;
    const rawCookie = request.cookies.get(cookieName)?.value;

    if (!rawCookie) {
        return NextResponse.json({
            hasCookie: false,
            cookies: [...request.cookies.getAll().map(c => c.name)],
        });
    }

    try {
        const session = await unsealData(rawCookie, {
            password: SESSION_OPTIONS.password as string,
            ttl: SESSION_OPTIONS.ttl,
        });
        return NextResponse.json({ hasCookie: true, session });
    } catch (e) {
        return NextResponse.json({ hasCookie: true, decryptError: String(e) });
    }
}

// POST /api/auth/debug — test setting a plain cookie (no iron-session)
export async function POST() {
    return new NextResponse(
        JSON.stringify({ message: 'Cookie test posé. Visitez GET /api/auth/debug pour vérifier.' }),
        {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Set-Cookie': 'debug_test=hello123; Path=/; HttpOnly; Max-Age=60',
            },
        }
    );
}
