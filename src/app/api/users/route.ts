import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, hashPassword } from '@/lib/auth';
import { readSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

// GET /api/users — list all users
export async function GET(req: NextRequest) {
    const session = await readSession(req);
    if (!session.userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const users = await getAllUsers();
    return NextResponse.json(users.map(u => ({
        id: u.id,
        email: u.email,
        totpEnabled: u.totpEnabled,
        createdAt: u.createdAt,
    })));
}

// POST /api/users — create a new user
export async function POST(req: NextRequest) {
    const session = await readSession(req);
    if (!session.userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { email, password } = await req.json();

    if (!email || !password) {
        return NextResponse.json({ error: 'Email et mot de passe requis.' }, { status: 400 });
    }
    if (password.length < 8) {
        return NextResponse.json({ error: 'Le mot de passe doit faire au moins 8 caractères.' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        return NextResponse.json({ error: 'Un compte avec cet email existe déjà.' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
        data: { email, passwordHash },
    });

    return NextResponse.json({ id: user.id, email: user.email, totpEnabled: false, createdAt: user.createdAt }, { status: 201 });
}
