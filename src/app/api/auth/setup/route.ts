import { NextRequest, NextResponse } from 'next/server';
import { hasUser, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    // Only allow setup if no user exists yet
    if (await hasUser()) {
        return NextResponse.json({ error: 'Un compte administrateur existe déjà.' }, { status: 403 });
    }

    const { email, password } = await request.json();

    if (!email || !password || password.length < 8) {
        return NextResponse.json({ error: 'Email et mot de passe requis (8 caractères minimum).' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    await prisma.user.create({ data: { email, passwordHash } });

    return NextResponse.json({ success: true });
}
