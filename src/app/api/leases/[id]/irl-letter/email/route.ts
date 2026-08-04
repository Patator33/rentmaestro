import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { readSession } from '@/lib/session';
import { applyRentRevisionCore, type RevisionParams } from '@/lib/rent-revision';

export const dynamic = 'force-dynamic';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await readSession(request);
    if (!session.userId || session.pendingTotp) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const { subject, body, revision } = await request.json();
    if (!subject || !body) return NextResponse.json({ error: 'Contenu manquant' }, { status: 400 });

    const lease = await prisma.lease.findUnique({
        where: { id },
        include: { tenant: true },
    });
    if (!lease) return NextResponse.json({ error: 'Bail introuvable' }, { status: 404 });
    if (!lease.tenant.email) return NextResponse.json({ error: 'Email locataire manquant' }, { status: 400 });

    const html = `<div style="font-family:sans-serif;color:#333;line-height:1.7;max-width:560px;white-space:pre-wrap">${body
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;

    const recipients = [lease.tenant.email];
    if (lease.tenant.coTenantEmail) recipients.push(lease.tenant.coTenantEmail);

    try {
        await sendEmail({ to: recipients.join(','), subject, html });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Erreur envoi' }, { status: 500 });
    }

    // Le locataire est informé : la révision est actée. Uniquement après un
    // envoi réussi, pour ne pas changer le loyer si le mail n'est pas parti.
    if (revision) {
        const applied = await applyRentRevisionCore(id, revision as RevisionParams);
        if (!applied.success) {
            return NextResponse.json({ success: true, revisionApplied: false, error: applied.error });
        }
        return NextResponse.json({ success: true, revisionApplied: true });
    }

    return NextResponse.json({ success: true, revisionApplied: false });
}
