import { NextRequest, NextResponse } from 'next/server';
import { getUser, verifyPassword } from '@/lib/auth';
import { getSessionFromRouteHandler } from '@/lib/session';

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

    const res = NextResponse.json({ success: true, requireTotp: user.totpEnabled });
    const session = await getSessionFromRouteHandler(request, res);

    if (user.totpEnabled) {
        // Partial session — TOTP still needs to be verified
        session.userId = user.id;
        session.email = user.email;
        session.pendingTotp = true;
    } else {
        // Full session
        session.userId = user.id;
        session.email = user.email;
        session.pendingTotp = false;
    }

    await session.save();
    return res;
}
