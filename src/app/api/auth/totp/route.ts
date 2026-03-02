import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'otplib';
import { getUser } from '@/lib/auth';
import { getSessionFromRouteHandler } from '@/lib/session';

const TOTP_OPTS = { algorithm: 'sha1' as const, digits: 6, period: 30, type: 'totp' as const };

export async function POST(request: NextRequest) {
    const { code } = await request.json();

    // Check that we have a pending-TOTP session
    const checkRes = NextResponse.next();
    const checkSession = await getSessionFromRouteHandler(request, checkRes);

    if (!checkSession.userId || !checkSession.pendingTotp) {
        return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
    }

    const user = await getUser();
    if (!user || user.id !== checkSession.userId || !user.totpSecret) {
        return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 401 });
    }

    const result = await verify({ token: code, secret: user.totpSecret, ...TOTP_OPTS });
    if (!result.valid) {
        return NextResponse.json({ error: 'Code incorrect ou expiré.' }, { status: 401 });
    }

    // Upgrade session: remove pendingTotp flag
    const res = NextResponse.json({ success: true });
    const session = await getSessionFromRouteHandler(request, res);
    session.userId = user.id;
    session.email = user.email;
    session.pendingTotp = false;
    await session.save();

    return res;
}
