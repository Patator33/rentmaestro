import { NextRequest, NextResponse } from 'next/server';
import { sealData } from 'iron-session';
import { verify } from 'otplib';
import { getUser } from '@/lib/auth';
import { readSession, SESSION_OPTIONS, type SessionData } from '@/lib/session';

const TOTP_OPTS = { algorithm: 'sha1' as const, digits: 6, period: 30 };

export async function POST(request: NextRequest) {
    const { code } = await request.json();
    const session = await readSession(request);

    if (!session.userId || !session.pendingTotp) {
        return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
    }

    const user = await getUser();
    if (!user || user.id !== session.userId || !user.totpSecret) {
        return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 401 });
    }

    const result = await verify({ token: code, secret: user.totpSecret, ...TOTP_OPTS });
    if (!result.valid) {
        return NextResponse.json({ error: 'Code incorrect ou expiré.' }, { status: 401 });
    }

    // Upgrade session: remove pendingTotp flag
    const sessionData: SessionData = {
        userId: session.userId,
        email: session.email,
        pendingTotp: false,
    };
    const sealed = await sealData(sessionData, { password: SESSION_OPTIONS.password as string });

    const secure = process.env.COOKIE_SECURE === 'true' ? '; Secure' : '';
    const setCookie = `${SESSION_OPTIONS.cookieName}=${sealed}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_OPTIONS.ttl}${secure}`;
    return new NextResponse(
        JSON.stringify({ success: true }),
        {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Set-Cookie': setCookie,
            },
        }
    );
}
