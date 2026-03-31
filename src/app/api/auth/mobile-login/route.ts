import { NextResponse } from 'next/server';
import { getUserByEmail, verifyPassword } from '@/lib/auth';
import { signMobileToken } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const { email, password } = await request.json();

    if (!email || !password) {
        return NextResponse.json({ error: 'Email et mot de passe requis.' }, { status: 400 });
    }

    const user = await getUserByEmail(email);
    if (!user) {
        return NextResponse.json({ error: 'Identifiants incorrects.' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
        return NextResponse.json({ error: 'Identifiants incorrects.' }, { status: 401 });
    }

    const token = signMobileToken(user.id, user.email);
    return NextResponse.json({ token, email: user.email });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
