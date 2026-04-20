import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { readFile } from 'fs/promises';
import path from 'path';

interface LeaseInfo {
    tenant: {
        firstName: string;
        lastName: string;
        email?: string | null;
        phone?: string | null;
        coTenantFirstName?: string | null;
        coTenantLastName?: string | null;
        coTenantEmail?: string | null;
        coTenantPhone?: string | null;
    };
    apartment: {
        address: string;
        zipCode: string;
        city: string;
        name?: string | null;
    };
    rentAmount: number;
    chargesAmount: number;
    startDate: Date;
    depositAmount?: number | null;
}

function sanitize(str: string): string {
    return str
        .replace(/\u2019/g, "'")
        .replace(/\u2018/g, "'")
        .replace(/\u201c/g, '"')
        .replace(/\u201d/g, '"')
        .replace(/\u2013/g, '-')
        .replace(/\u2014/g, '-')
        .replace(/[\u0100-\uFFFF]/g, c => {
            const map: Record<string, string> = {
                '\u00e9': 'e', '\u00e8': 'e', '\u00ea': 'e', '\u00eb': 'e',
                '\u00e0': 'a', '\u00e2': 'a', '\u00e4': 'a',
                '\u00f9': 'u', '\u00fb': 'u', '\u00fc': 'u',
                '\u00ee': 'i', '\u00ef': 'i',
                '\u00f4': 'o', '\u00f6': 'o',
                '\u00e7': 'c',
                '\u00c9': 'E', '\u00c8': 'E', '\u00ca': 'E',
                '\u00c0': 'A', '\u00c2': 'A',
                '\u00ce': 'I', '\u00d4': 'O',
                '\u00d9': 'U', '\u00db': 'U',
                '\u00c7': 'C',
            };
            return map[c] ?? '?';
        });
}

export async function buildSigningPdf(
    docUrl: string,
    lease: LeaseInfo,
    type: 'bail' | 'edl'
): Promise<Buffer> {
    // Load original template from disk
    const filePath = path.join(process.cwd(), 'public', docUrl.startsWith('/') ? docUrl.slice(1) : docUrl);
    const templateBytes = await readFile(filePath);
    const templateDoc = await PDFDocument.load(templateBytes);

    // If the PDF has AcroForm fields, fill them and return directly (no cover page)
    const form = templateDoc.getForm();
    const fields = form.getFields();
    if (fields.length > 0) {
        const tenantName = `${lease.tenant.firstName} ${lease.tenant.lastName}`;
        const coTenantName = lease.tenant.coTenantFirstName
            ? `${lease.tenant.coTenantFirstName} ${lease.tenant.coTenantLastName ?? ''}`.trim()
            : null;
        const fullName = coTenantName ? `${tenantName} / ${coTenantName}` : tenantName;
        const dateDebut = new Date(lease.startDate).toLocaleDateString('fr-FR');

        const fieldMap = new Map(fields.map(f => [f.getName().trim(), f.getName()]));
        const tryFill = (name: string, value: string) => {
            try { form.getTextField(fieldMap.get(name) ?? name).setText(value); } catch { /* field absent */ }
        };
        tryFill('nom_locataire', fullName);
        tryFill('date_debut', dateDebut);
        tryFill('loyer_hc', `${lease.rentAmount.toFixed(2)} EUR`);
        tryFill('charges', `${lease.chargesAmount.toFixed(2)} EUR`);
        tryFill('loyer_cc', `${(lease.rentAmount + lease.chargesAmount).toFixed(2)} EUR`);
        if (lease.depositAmount) tryFill('caution', `${lease.depositAmount.toFixed(2)} EUR`);
        tryFill('adresse_bien', `${lease.apartment.address}, ${lease.apartment.zipCode} ${lease.apartment.city}`);

        form.flatten();
        const bytes = await templateDoc.save();
        return Buffer.from(bytes);
    }

    // Build cover page
    const coverDoc = await PDFDocument.create();
    const page = coverDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();
    const margin = 55;

    const fontRegular = await coverDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await coverDoc.embedFont(StandardFonts.HelveticaBold);

    const blue = rgb(0.17, 0.55, 0.93);
    const dark = rgb(0.08, 0.08, 0.08);
    const muted = rgb(0.4, 0.4, 0.4);
    const white = rgb(1, 1, 1);

    // Header band
    page.drawRectangle({ x: 0, y: height - 72, width, height: 72, color: blue });
    const title = type === 'bail' ? 'BAIL DE LOCATION' : 'ETAT DES LIEUX';
    page.drawText(title, { x: margin, y: height - 45, font: fontBold, size: 22, color: white });
    page.drawText('A signer et retourner', { x: margin, y: height - 63, font: fontRegular, size: 11, color: rgb(0.85, 0.92, 1) });

    let y = height - 105;

    const section = (label: string) => {
        page.drawText(label.toUpperCase(), { x: margin, y, font: fontBold, size: 9, color: blue });
        y -= 4;
        page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: blue });
        y -= 16;
    };

    const row = (label: string, value: string) => {
        page.drawText(sanitize(label), { x: margin, y, font: fontRegular, size: 10, color: muted });
        page.drawText(sanitize(value), { x: margin + 155, y, font: fontBold, size: 10, color: dark });
        y -= 18;
    };

    // Locataire
    section('Locataire principal');
    row('Nom', `${lease.tenant.firstName} ${lease.tenant.lastName}`);
    if (lease.tenant.email) row('Email', lease.tenant.email);
    if (lease.tenant.phone) row('Telephone', lease.tenant.phone);

    if (lease.tenant.coTenantFirstName) {
        y -= 6;
        section('Co-locataire');
        row('Nom', `${lease.tenant.coTenantFirstName} ${lease.tenant.coTenantLastName ?? ''}`);
        if (lease.tenant.coTenantEmail) row('Email', lease.tenant.coTenantEmail);
        if (lease.tenant.coTenantPhone) row('Telephone', lease.tenant.coTenantPhone);
    }

    y -= 6;
    section('Logement');
    row('Adresse', `${lease.apartment.address}`);
    row('Ville', `${lease.apartment.zipCode} ${lease.apartment.city}`);
    if (lease.apartment.name) row('Designation', lease.apartment.name);

    y -= 6;
    section('Conditions financieres');
    if (type === 'bail') {
        row('Loyer hors charges', `${lease.rentAmount.toFixed(2)} EUR`);
        row('Charges', `${lease.chargesAmount.toFixed(2)} EUR`);
        row('Loyer charges comprises', `${(lease.rentAmount + lease.chargesAmount).toFixed(2)} EUR`);
        if (lease.depositAmount) row('Depot de garantie', `${lease.depositAmount.toFixed(2)} EUR`);
    }
    row('Date de debut du bail', new Date(lease.startDate).toLocaleDateString('fr-FR'));

    // Footer
    page.drawText('Document genere par Rentmaestro', {
        x: margin, y: 28, font: fontRegular, size: 8, color: muted,
    });
    page.drawText(new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }), {
        x: width - margin - 100, y: 28, font: fontRegular, size: 8, color: muted,
    });

    // Merge: cover + template pages
    const finalDoc = await PDFDocument.create();
    const [coverPage] = await finalDoc.copyPages(coverDoc, [0]);
    finalDoc.addPage(coverPage);

    const templatePageIndices = templateDoc.getPageIndices();
    const copiedPages = await finalDoc.copyPages(templateDoc, templatePageIndices);
    for (const p of copiedPages) finalDoc.addPage(p);

    const bytes = await finalDoc.save();
    return Buffer.from(bytes);
}
