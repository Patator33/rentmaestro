import { NextRequest, NextResponse } from 'next/server';
import { sealData } from 'iron-session';
import { getUser, verifyPassword } from '@/lib/auth';
import { SESSION_OPTIONS, type SessionData } from '@/lib/session';

function buildSetCookie(name: string, value: string, maxAge: number): string {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export async function POST(request: NextRequest) {
    const { email, password } = await request.json();

    const user = await getUser();

    if (!user || user.email !== email) {
        return NextResponse.json({ error: 'Identifiants incorrects.' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
        return NextResponse.json({ error: 'Identifiants incorrects.' }, { status: 401 });
    }

    const sessionData: SessionData = {
        userId: user.id,
        email: user.email,
        pendingTotp: user.totpEnabled,
    };

    const sealed = await sealData(sessionData, { password: SESSION_OPTIONS.password as string });

    return new NextResponse(
        JSON.stringify({ success: true, requireTotp: user.totpEnabled }),
        {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Set-Cookie': buildSetCookie(SESSION_OPTIONS.cookieName, sealed, SESSION_OPTIONS.ttl as number),
            },
        }
    );
}
