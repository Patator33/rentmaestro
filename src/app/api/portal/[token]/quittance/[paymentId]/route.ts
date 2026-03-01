import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateQuittanceHtml } from '@/lib/quittance';
import { notifyN8n } from '@/lib/n8n';
import { sendEmail } from '@/lib/email';
import puppeteer from 'puppeteer';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ token: string; paymentId: string }> }
) {
    const { token, paymentId } = await params;

    // Validate portal token
    const tenant = await prisma.tenant.findUnique({ where: { portalToken: token } });
    if (!tenant) {
        return new NextResponse('Non autorisé', { status: 401 });
    }

    // Fetch payment with full relations
    const payment = await prisma.rentPayment.findUnique({
        where: { id: paymentId },
        include: {
            lease: {
                include: {
                    apartment: true,
                    tenant: true,
                }
            }
        }
    });

    if (!payment || payment.status !== 'PAID') {
        return new NextResponse('Quittance introuvable ou non payée', { status: 404 });
    }

    // Verify the payment belongs to this tenant
    if (payment.lease.tenantId !== tenant.id) {
        return new NextResponse('Non autorisé', { status: 403 });
    }

    try {
        const monthName = format(new Date(payment.period), 'MMMM yyyy', { locale: fr });

        // Notify landlord via n8n webhook
        await notifyN8n('RECEIPT_DOWNLOADED_BY_TENANT', {
            tenantName: `${tenant.firstName} ${tenant.lastName}`,
            apartment: payment.lease.apartment.address,
            city: payment.lease.apartment.city,
            period: monthName,
            amount: payment.amount,
        });

        // Notify landlord via email (if SMTP is configured)
        if (process.env.SMTP_USER) {
            try {
                await sendEmail({
                    to: process.env.SMTP_USER,
                    subject: `Quittance téléchargée — ${tenant.firstName} ${tenant.lastName}`,
                    html: `
                        <div style="font-family: sans-serif; color: #333; line-height: 1.6; max-width: 500px;">
                            <h2 style="color: #1e293b;">Quittance téléchargée par votre locataire</h2>
                            <p><strong>${tenant.firstName} ${tenant.lastName}</strong> vient de télécharger sa quittance de <strong>${monthName}</strong>
                            pour le logement au <strong>${payment.lease.apartment.address}, ${payment.lease.apartment.city}</strong>.</p>
                            <p>Montant : <strong>${payment.amount.toFixed(2)} €</strong></p>
                            <br/>
                            <p style="color: #64748b; font-size: 0.9rem;"><em>Rentmaestro — Gestion Locative</em></p>
                        </div>
                    `,
                });
            } catch {
                // Email failure is non-blocking
            }
        }

        // Generate PDF
        const htmlContent = generateQuittanceHtml(payment.lease, payment.period);
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            headless: true,
        });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
        });
        await browser.close();

        const filename = `Quittance_Loyer_${format(new Date(payment.period), 'MMMM_yyyy', { locale: fr })}.pdf`;
        return new NextResponse(Buffer.from(pdfBuffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });

    } catch (error) {
        console.error('Erreur génération PDF portail:', error);
        return new NextResponse('Erreur Serveur Interne', { status: 500 });
    }
}
