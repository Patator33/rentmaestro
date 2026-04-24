import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';
import { sendEmail } from '@/lib/email';
import { buildSigningPdf } from '@/lib/pdf-signing';

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

    if (body.action === 'sendBailType' || body.action === 'sendEdl') {
        const aptDocType = body.action === 'sendBailType' ? 'BAIL_TYPE' : 'ETAT_DES_LIEUX';
        const emailType: 'bail' | 'edl' = body.action === 'sendBailType' ? 'bail' : 'edl';

        const lease = await prisma.lease.findUnique({
            where: { id },
            include: {
                tenant: true,
                apartment: { include: { documents: true } },
            },
        });
        if (!lease) return NextResponse.json({ error: 'Bail introuvable' }, { status: 404 });
        if (!lease.tenant.email) return NextResponse.json({ error: 'Email locataire manquant' }, { status: 400 });

        const doc = (lease.apartment as any).documents.find((d: any) => d.docType === aptDocType);
        if (!doc) return NextResponse.json({ error: body.action === 'sendBailType' ? 'Aucun bail type sur cet appartement' : 'Aucun état des lieux sur cet appartement' }, { status: 404 });

        // Build PDF with tenant cover page
        const pdfBuffer = await buildSigningPdf(doc.url, lease, emailType);

        const baseUrl = process.env.APP_BASE_URL || 'https://rentmaestro.nico33.net';
        const aptAddress = `${lease.apartment.address}, ${lease.apartment.zipCode} ${lease.apartment.city}`;
        const portalLink = lease.tenant.portalToken
            ? `<p>Retrouvez vos documents sur votre <a href="${baseUrl}/portal/${lease.tenant.portalToken}" style="color:#2b8cee;">espace locataire →</a></p>`
            : '';

        const isBail = emailType === 'bail';
        const subject = isBail
            ? `Bail de location à signer — ${lease.apartment.name || lease.apartment.address}`
            : `Etat des lieux — ${lease.apartment.name || lease.apartment.address}`;

        const html = `
            <div style="font-family:sans-serif;color:#333;line-height:1.6;max-width:560px">
                <h2>Bonjour ${lease.tenant.firstName},</h2>
                <p>Veuillez trouver en pièce jointe ${isBail ? 'le bail de location' : "l'état des lieux"}. Merci de le <strong>signer et nous le retourner</strong> dès que possible.</p>
                <table style="width:100%;border-collapse:collapse;margin:1rem 0;font-size:0.9rem;border:1px solid #e2e8f0">
                    <tr style="background:#f8fafc"><td style="padding:0.4rem 0.7rem;color:#64748b;font-weight:600;width:150px">Logement</td><td style="padding:0.4rem 0.7rem;color:#1e293b">${aptAddress}</td></tr>
                    ${isBail ? `<tr><td style="padding:0.4rem 0.7rem;color:#64748b;font-weight:600">Loyer CC</td><td style="padding:0.4rem 0.7rem;font-weight:700;color:#2b8cee">${(lease.rentAmount + lease.chargesAmount).toFixed(2)} €</td></tr>` : ''}
                    <tr ${isBail ? 'style="background:#f8fafc"' : ''}><td style="padding:0.4rem 0.7rem;color:#64748b;font-weight:600">Date d'entrée</td><td style="padding:0.4rem 0.7rem;color:#1e293b">${new Date(lease.startDate).toLocaleDateString('fr-FR')}</td></tr>
                </table>
                ${portalLink}
                <br /><p>Cordialement,</p>
                <p><strong>Céline et Nicolas</strong><br /><em>Via Rentmaestro</em></p>
            </div>`;

        const filename = isBail
            ? `bail-${lease.tenant.lastName.toLowerCase()}-${lease.apartment.city.toLowerCase()}.pdf`
            : `etat-des-lieux-${lease.tenant.lastName.toLowerCase()}-${lease.apartment.city.toLowerCase()}.pdf`;

        const recipients = [lease.tenant.email];
        if (lease.tenant.coTenantEmail) recipients.push(lease.tenant.coTenantEmail);

        try {
            await sendEmail({
                to: recipients.join(','),
                subject,
                html,
                attachments: [{ filename, content: pdfBuffer, contentType: 'application/pdf' }],
            });
            return NextResponse.json({ success: true });
        } catch (e: any) {
            return NextResponse.json({ error: e.message || 'Erreur envoi email' }, { status: 500 });
        }
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { id } = await params;
    try {
        await prisma.lease.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Erreur suppression bail' }, { status: 500 });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
