import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { id } = await params;

    const [lease, globalDocuments] = await Promise.all([
        prisma.lease.findUnique({
            where: { id },
            include: {
                tenant: true,
                apartment: {
                    include: {
                        company: { include: { documents: { orderBy: { createdAt: 'asc' } } } },
                        documents: { orderBy: { createdAt: 'asc' } },
                    },
                },
                payments: { orderBy: { period: 'desc' } },
                documents: { orderBy: { createdAt: 'asc' } },
            },
        }),
        prisma.globalDocument.findMany({ orderBy: { createdAt: 'asc' } }),
    ]);

    if (!lease) return NextResponse.json({ error: 'Bail introuvable.' }, { status: 404 });
    return NextResponse.json({ ...lease, globalDocuments });
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { id } = await params;
    const body = await request.json();
    const { startDate, endDate, rentAmount, chargesAmount, depositAmount, depositStatus, isActive, rentEffectiveDate } = body;

    let effectiveDate: Date | null = null;
    if (rentEffectiveDate) {
        const [y, m] = (rentEffectiveDate as string).split('-').map(Number);
        effectiveDate = new Date(Date.UTC(y, m - 1, 1));
    }

    const lease = await prisma.lease.update({
        where: { id },
        data: {
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : null,
            rentAmount: rentAmount != null ? parseFloat(rentAmount) : undefined,
            chargesAmount: chargesAmount != null ? parseFloat(chargesAmount) : undefined,
            depositAmount: depositAmount != null ? parseFloat(depositAmount) : undefined,
            depositStatus: depositStatus !== undefined ? depositStatus : undefined,
            isActive: isActive != null ? Boolean(isActive) : undefined,
            ...(effectiveDate ? { lastRentReviewDate: effectiveDate } : {}),
        },
    });

    if (effectiveDate && (rentAmount != null || chargesAmount != null)) {
        const newRent = rentAmount != null ? parseFloat(rentAmount) : lease.rentAmount;
        const newCharges = chargesAmount != null ? parseFloat(chargesAmount) : lease.chargesAmount;
        await prisma.rentPayment.updateMany({
            where: {
                leaseId: id,
                period: { gte: effectiveDate },
                status: { not: 'PAID' },
            },
            data: { amount: newRent + newCharges },
        });
    }

    return NextResponse.json(lease);
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { id } = await params;
    const body = await request.json();

    if (body.action === 'depositPay') {
        const paidAmount = parseFloat(body.paidAmount);
        if (isNaN(paidAmount) || paidAmount <= 0) {
            return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });
        }
        const lease = await prisma.lease.findUnique({ where: { id } });
        if (!lease) return NextResponse.json({ error: 'Bail introuvable' }, { status: 404 });
        const total = lease.depositAmount ?? 0;
        const alreadyPaid = lease.depositPaidAmount ?? 0;
        const totalPaid = alreadyPaid + paidAmount;
        const isComplete = totalPaid >= total;
        await prisma.lease.update({
            where: { id },
            data: {
                depositPaidAmount: isComplete ? null : totalPaid,
                depositStatus: isComplete ? 'RECEIVED' : 'PARTIAL_RECEIVED',
            },
        });
        return NextResponse.json({ success: true, status: isComplete ? 'RECEIVED' : 'PARTIAL_RECEIVED' });
    }

    if (body.action === 'terminate') {
        const terminationDate = body.terminationDate ? new Date(body.terminationDate) : new Date();
        await prisma.lease.update({
            where: { id },
            data: { isActive: false, endDate: terminationDate },
        });
        return NextResponse.json({ success: true });
    }

    if (body.action === 'sendDocuments') {
        const docs: { name: string; url: string; docType: string }[] = body.docs ?? [];
        if (docs.length === 0) return NextResponse.json({ error: 'Aucun document sélectionné' }, { status: 400 });

        const lease = await prisma.lease.findUnique({
            where: { id },
            include: { tenant: true, apartment: true },
        });
        if (!lease) return NextResponse.json({ error: 'Bail introuvable' }, { status: 404 });
        if (!lease.tenant.email) return NextResponse.json({ error: 'Email locataire manquant' }, { status: 400 });

        const baseUrl = process.env.APP_BASE_URL || 'https://rentmaestro.nico33.net';
        const docLines = docs.map(d =>
            `<li style="margin:0.4rem 0"><a href="${baseUrl}${encodeURI(d.url)}" style="color:#2B8CEE">${d.name}</a></li>`
        ).join('');

        const portalLink = lease.tenant.portalToken
            ? `<p>Retrouvez tous vos documents sur votre <a href="${baseUrl}/portal/${lease.tenant.portalToken}" style="color:#2b8cee;">espace locataire →</a></p>`
            : '';

        const html = `
            <div style="font-family:sans-serif;color:#333;line-height:1.6;max-width:560px">
                <h2>Bonjour ${lease.tenant.firstName},</h2>
                <p>Veuillez trouver ci-dessous les documents relatifs à votre logement situé au <strong>${lease.apartment.address}, ${lease.apartment.city}</strong> :</p>
                <ul style="padding-left:1.25rem">${docLines}</ul>
                <p>N'hésitez pas à nous contacter pour toute question.</p>
                ${portalLink}
                <br />
                <p>Cordialement,</p>
                <p><strong>Céline et Nicolas</strong><br /><em>Via Rentmaestro</em></p>
            </div>
        `;

        const recipients = [lease.tenant.email];
        if (lease.tenant.coTenantEmail) recipients.push(lease.tenant.coTenantEmail);

        try {
            await sendEmail({
                to: recipients.join(','),
                subject: `Documents — ${lease.apartment.name || lease.apartment.address}`,
                html,
            });
            return NextResponse.json({ success: true });
        } catch (e: any) {
            return NextResponse.json({ error: e.message || 'Erreur envoi email' }, { status: 500 });
        }
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
