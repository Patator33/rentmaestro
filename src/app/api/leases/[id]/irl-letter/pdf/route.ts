import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateIrlLetterHtml, defaultBailleur } from '@/lib/irl-letter';
import puppeteer from 'puppeteer';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const url = new URL(request.url);
        const q = url.searchParams;

        const baseQuarter = q.get('baseQuarter') || '';
        const baseIndex = parseFloat(q.get('baseIndex') || '');
        const newQuarter = q.get('newQuarter') || '';
        const newIndex = parseFloat(q.get('newIndex') || '');
        const newRent = parseFloat(q.get('newRent') || '');
        const effective = q.get('effective');

        if (!baseQuarter || isNaN(baseIndex) || !newQuarter || isNaN(newIndex) || isNaN(newRent)) {
            return new NextResponse('Paramètres de révision manquants', { status: 400 });
        }

        const lease = await prisma.lease.findUnique({
            where: { id },
            include: { tenant: true, apartment: { include: { company: true } } },
        });
        if (!lease) return new NextResponse('Bail introuvable', { status: 404 });

        const bailleur = defaultBailleur(lease.apartment.company);
        const tenantName = `${lease.tenant.firstName} ${lease.tenant.lastName}`
            + (lease.tenant.coTenantFirstName ? ` et ${lease.tenant.coTenantFirstName} ${lease.tenant.coTenantLastName ?? ''}`.trim() : '');
        const apartmentAddress = `${lease.apartment.address}, ${lease.apartment.zipCode} ${lease.apartment.city}`;

        let effectiveDate = new Date();
        if (effective) {
            const [y, m] = effective.split('-').map(Number);
            effectiveDate = new Date(Date.UTC(y, m - 1, 1));
        }

        const html = generateIrlLetterHtml({
            bailleurName: bailleur.name,
            bailleurAddress: bailleur.address,
            tenantName,
            apartmentAddress,
            oldRent: lease.rentAmount,
            newRent,
            charges: lease.chargesAmount,
            baseQuarter,
            baseIndex,
            newQuarter,
            newIndex,
            effectiveDate,
        });

        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            headless: true,
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        const lastName = lease.tenant.lastName.replace(/\s+/g, '_');
        const filename = `Revision_loyer_${lastName}_${newQuarter}.pdf`;
        return new NextResponse(Buffer.from(pdfBuffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error('Erreur génération PDF révision:', error);
        return new NextResponse('Erreur Serveur Interne', { status: 500 });
    }
}
