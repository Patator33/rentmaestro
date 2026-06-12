import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateQuittanceHtml } from '@/lib/quittance';
import { readSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

// Imported HTML logic

export async function GET(request: NextRequest) {
    const session = await readSession(request);
    if (!session.userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

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
                apartment: { include: { company: true } },
                tenant: true,
            }
        });

        if (!lease) {
            return NextResponse.json({ error: 'Bail introuvable' }, { status: 404 });
        }

        const period = new Date(periodStr);

        const payment = await prisma.rentPayment.findFirst({
            where: { leaseId, period, status: 'PAID' }
        });

        const baseUrl = process.env.APP_BASE_URL || new URL(request.url).origin;
        const verifyUrl = payment ? `${baseUrl}/api/verify/${payment.id}` : undefined;

        // Generate a clean HTML-based PDF-printable quittance
        const html = generateQuittanceHtml(lease, period, verifyUrl, payment?.amount);

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
