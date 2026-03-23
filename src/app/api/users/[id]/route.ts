import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

// DELETE /api/users/[id] — delete a user (cannot delete yourself)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await readSession(req);
    if (!session.userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { id } = await params;

    if (id === session.userId) {
        return NextResponse.json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' }, { status: 400 });
    }

    try {
        await prisma.user.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 });
    }
}
