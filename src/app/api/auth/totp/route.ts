import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'otplib';
import { getUser } from '@/lib/auth';
import { getSession } from '@/lib/session';

const TOTP_OPTS = { algorithm: 'sha1' as const, digits: 6, period: 30, type: 'totp' as const };

export async function POST(request: NextRequest) {
    const { code } = await request.json();
    const session = await getSession();

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
    session.pendingTotp = false;
    await session.save();

    return NextResponse.json({ success: true });
}
