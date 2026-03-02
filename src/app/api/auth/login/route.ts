import { NextRequest, NextResponse } from 'next/server';
import { getUser, verifyPassword } from '@/lib/auth';
import { getSession } from '@/lib/session';

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

    const session = await getSession();

    if (user.totpEnabled) {
        session.userId = user.id;
        session.email = user.email;
        session.pendingTotp = true;
    } else {
        session.userId = user.id;
        session.email = user.email;
        session.pendingTotp = false;
    }

    await session.save();
    return NextResponse.json({ success: true, requireTotp: user.totpEnabled });
}
