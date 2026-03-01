import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateQuittanceHtml } from '@/lib/quittance';
import puppeteer from 'puppeteer';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ paymentId: string }> }
) {
    try {
        const { paymentId } = await params;
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

        // 1. Generate the HTML string using our shared utility
        const baseUrl = new URL(request.url).origin;
        const verifyUrl = `${baseUrl}/api/verify/${paymentId}`;
        const htmlContent = generateQuittanceHtml(payment.lease, payment.period, verifyUrl);

        // 2. Launch Puppeteer
        // In local development, this defaults to the bundled Chromium.
        // In Docker (where PUPPETEER_EXECUTABLE_PATH is set), it uses the Alpine Chromium.
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            headless: true
        });

        const page = await browser.newPage();

        // 3. Set content and render PDF
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px'
            }
        });

        await browser.close();

        // 4. Send the PDF as a downloadable attachment
        const monthName = format(new Date(payment.period), 'MMMM_yyyy', { locale: fr });
        const filename = `Quittance_Loyer_${monthName}.pdf`;

        // Using Array.from to convert Uint8Array properly for NextResponse body if needed, 
        // or just wrapping it in a Buffer
        return new NextResponse(Buffer.from(pdfBuffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`
            }
        });

    } catch (error) {
        console.error("Erreur génération PDF:", error);
        return new NextResponse('Erreur Serveur Interne', { status: 500 });
    }
}
