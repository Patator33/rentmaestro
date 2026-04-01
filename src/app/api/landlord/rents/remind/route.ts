import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

function getMonthYear(date: Date): string {
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

// POST { leaseId, period: "YYYY-MM" }
export async function POST(request: Request) {
    if (!verifyMobileToken(request)) return unauthorized();

    const { leaseId, period: periodStr } = await request.json();
    if (!leaseId || !periodStr) {
        return NextResponse.json({ error: 'leaseId et period requis.' }, { status: 400 });
    }

    const [y, m] = periodStr.split('-').map(Number);
    const period = new Date(Date.UTC(y, m - 1, 1));

    let payment = await prisma.rentPayment.findFirst({
        where: { leaseId, period },
        include: { lease: { include: { tenant: true, apartment: true } } },
    });

    if (!payment) {
        const lease = await prisma.lease.findUnique({
            where: { id: leaseId },
            include: { tenant: true, apartment: true },
        });
        if (!lease) return NextResponse.json({ error: 'Bail introuvable.' }, { status: 404 });
        payment = await prisma.rentPayment.create({
            data: { leaseId, period, amount: lease.rentAmount + lease.chargesAmount, status: 'PENDING' },
            include: { lease: { include: { tenant: true, apartment: true } } },
        }) as any;
    }

    if (!payment) return NextResponse.json({ error: 'Paiement introuvable.' }, { status: 404 });
    if (payment.status === 'PAID') return NextResponse.json({ error: 'Ce loyer est déjà payé.' }, { status: 400 });
    if (!payment.lease.tenant.email) return NextResponse.json({ error: 'Le locataire n\'a pas d\'adresse email.' }, { status: 400 });

    const formattedPeriod = getMonthYear(payment.period);
    const amount = payment.amount.toFixed(2);
    const tenant = payment.lease.tenant;
    const apartment = payment.lease.apartment;

    const html = `
        <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
            <h2>Bonjour ${tenant.firstName},</h2>
            <p>Sauf erreur ou omission de notre part, il semblerait que le paiement de votre loyer pour la période de <strong>${formattedPeriod}</strong> soit toujours en attente.</p>
            <p>Le montant dû est de <strong>${amount} €</strong> pour le logement situé au ${apartment.address}, ${apartment.city}.</p>
            <p>Si vous avez déjà procédé au règlement, merci de ne pas tenir compte de cet email.</p>
            <p>Dans le cas contraire, nous vous invitons à régulariser la situation dans les meilleurs délais.</p>
            <br />
            <p>Cordialement,</p>
            <p><strong>Votre propriétaire</strong><br /><em>Via Rentmaestro</em></p>
        </div>
    `;

    await sendEmail({
        to: tenant.email,
        subject: `Rappel : Loyer en attente - ${formattedPeriod}`,
        html,
    });

    await prisma.rentPayment.update({
        where: { id: payment.id },
        data: { sentAt: new Date() },
    });

    return NextResponse.json({ success: true });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
