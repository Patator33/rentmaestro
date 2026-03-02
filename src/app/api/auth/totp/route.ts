import { NextRequest, NextResponse } from 'next/server';
import { authenticator } from 'otplib';
import { getUser } from '@/lib/auth';
import { getSessionFromRouteHandler } from '@/lib/session';

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

    const valid = authenticator.verify({ token: code, secret: user.totpSecret });
    if (!valid) {
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
