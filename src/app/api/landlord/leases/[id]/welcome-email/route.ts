import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { subject, body } = await request.json();

    if (!subject || !body) return NextResponse.json({ error: 'Contenu manquant' }, { status: 400 });

    const lease = await prisma.lease.findUnique({
        where: { id },
        include: { tenant: true, apartment: true },
    });
    if (!lease) return NextResponse.json({ error: 'Bail introuvable' }, { status: 404 });
    if (!lease.tenant.email) return NextResponse.json({ error: 'Email locataire manquant' }, { status: 400 });

    const html = `<div style="font-family:sans-serif;color:#333;line-height:1.7;max-width:560px;white-space:pre-wrap">${body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;

    const recipients = [lease.tenant.email];
    if (lease.tenant.coTenantEmail) recipients.push(lease.tenant.coTenantEmail);

    try {
        await sendEmail({ to: recipients.join(','), subject, html });
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Erreur envoi' }, { status: 500 });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
