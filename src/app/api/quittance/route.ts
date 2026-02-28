import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateQuittanceHtml } from '@/lib/quittance';

export const dynamic = 'force-dynamic';

// Imported HTML logic

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const leaseId = searchParams.get('leaseId');
    const periodStr = searchParams.get('period');

    if (!leaseId || !periodStr) {
        return NextResponse.json({ error: 'leaseId et period sont requis' }, { status: 400 });
    }

    try {
        const lease = await prisma.lease.findUnique({
            where: { id: leaseId },
            include: {
                apartment: true,
                tenant: true,
            }
        });

        if (!lease) {
            return NextResponse.json({ error: 'Bail introuvable' }, { status: 404 });
        }

        const period = new Date(periodStr);
        const totalAmount = lease.rentAmount + lease.chargesAmount;

        // Generate a clean HTML-based PDF-printable quittance
        const html = generateQuittanceHtml(lease, period);

        return new NextResponse(html, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
            },
        });

    } catch (error) {
        console.error('Erreur quittance:', error);
        return NextResponse.json({ error: 'Erreur lors de la génération de la quittance' }, { status: 500 });
    }
}
