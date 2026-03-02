import { NextRequest, NextResponse } from 'next/server';
import { sealData } from 'iron-session';
import { getUser, verifyPassword } from '@/lib/auth';
import { SESSION_OPTIONS, type SessionData } from '@/lib/session';

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

    const response = NextResponse.json({ success: true, requireTotp: user.totpEnabled });
    response.cookies.set({
        name: SESSION_OPTIONS.cookieName,
        value: sealed,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_OPTIONS.ttl,
        path: '/',
    });

    return response;
}
