import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

// POST /api/users/[id]/reset-totp — disable TOTP for a user
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await readSession(req);
    if (!session.userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { id } = await params;

    try {
        await prisma.user.update({
            where: { id },
            data: { totpSecret: null, totpEnabled: false },
        });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 });
    }
}
