import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { logAction } from '@/lib/audit';

// POST /api/users/[id]/reset-totp — disable TOTP for a user.
// Cross-user reset is allowed on purpose (account recovery between admins)
// but is always audit-logged with both actor and target.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await readSession(req);
    if (!session.userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { id } = await params;

    try {
        const target = await prisma.user.update({
            where: { id },
            data: { totpSecret: null, totpEnabled: false },
        });
        await logAction({
            action: 'RESET_TOTP',
            entity: 'User',
            entityId: id,
            userEmail: session.email,
            details: id === session.userId
                ? 'TOTP désactivé (propre compte)'
                : `TOTP désactivé pour ${target.email} par ${session.email}`,
        });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 });
    }
}
