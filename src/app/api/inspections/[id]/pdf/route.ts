import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import puppeteer from 'puppeteer';

interface Room {
    name: string;
    condition: 'BON' | 'MOYEN' | 'MAUVAIS';
    notes: string;
}

const CONDITION_STYLE: Record<string, { label: string; color: string; bg: string }> = {
    BON: { label: 'Bon état', color: '#16a34a', bg: '#f0fdf4' },
    MOYEN: { label: 'État moyen', color: '#d97706', bg: '#fffbeb' },
    MAUVAIS: { label: 'Mauvais état', color: '#dc2626', bg: '#fef2f2' },
};

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const inspection = await prisma.inspection.findUnique({
        where: { id },
        include: {
            lease: {
                include: {
                    apartment: true,
                    tenant: true,
                }
            }
        }
    });

    if (!inspection) {
        return new NextResponse('État des lieux introuvable', { status: 404 });
    }

    const rooms: Room[] = JSON.parse(inspection.rooms || '[]');
    const isEntry = inspection.type === 'ENTRY';
    const date = new Date(inspection.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

    const roomsHtml = rooms.map(room => {
        const s = CONDITION_STYLE[room.condition] ?? CONDITION_STYLE.BON;
        return `
            <tr>
                <td style="padding:0.6rem 0.75rem;border-bottom:1px solid #f1f5f9;">${room.name}</td>
                <td style="padding:0.6rem 0.75rem;border-bottom:1px solid #f1f5f9;">
                    <span style="background:${s.bg};color:${s.color};padding:0.2rem 0.6rem;border-radius:9999px;font-size:12px;font-weight:600;">${s.label}</span>
                </td>
                <td style="padding:0.6rem 0.75rem;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;">${room.notes || '—'}</td>
            </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>État des lieux — ${date}</title>
    <style>
        @page { size: A4; margin: 2cm; }
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size:14px; color:#1a1a1a; line-height:1.6; }
        .header { border-bottom:3px solid ${isEntry ? '#2b8cee' : '#e879a8'}; padding-bottom:1.2rem; margin-bottom:2rem; display:flex; justify-content:space-between; align-items:flex-start; }
        .header h1 { font-size:22px; color:${isEntry ? '#2b8cee' : '#e879a8'}; }
        .header p { font-size:13px; color:#64748b; margin-top:0.25rem; }
        .badge { display:inline-block; background:${isEntry ? '#eff6ff' : '#fdf2f8'}; color:${isEntry ? '#2b8cee' : '#e879a8'}; padding:0.3rem 0.9rem; border-radius:9999px; font-weight:700; font-size:13px; }
        .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; margin-bottom:2rem; }
        .info-box { background:#f8fafc; padding:1rem; border-radius:8px; }
        .info-box h3 { font-size:11px; text-transform:uppercase; letter-spacing:0.1em; color:#888; margin-bottom:0.4rem; }
        table { width:100%; border-collapse:collapse; margin-bottom:1.5rem; }
        thead th { background:#f8fafc; padding:0.6rem 0.75rem; text-align:left; font-size:12px; text-transform:uppercase; color:#888; letter-spacing:0.05em; }
        .notes-box { background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:1rem; margin-top:1.5rem; }
        .notes-box h3 { font-size:12px; font-weight:700; color:#92400e; margin-bottom:0.5rem; text-transform:uppercase; }
        .signature { margin-top:3rem; display:grid; grid-template-columns:1fr 1fr; gap:3rem; }
        .sig-box { border-top:1px solid #ccc; padding-top:0.5rem; }
        .sig-label { font-size:12px; color:#888; }
        .sig-line { height:3rem; }
        .footer { margin-top:2rem; text-align:center; font-size:11px; color:#999; border-top:1px solid #eee; padding-top:0.75rem; }
        @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>ÉTAT DES LIEUX D'${isEntry ? 'ENTRÉE' : 'SORTIE'}</h1>
            <p>Établi le ${date}</p>
        </div>
        <span class="badge">${isEntry ? '📥 Entrée' : '📤 Sortie'}</span>
    </div>

    <div class="info-grid">
        <div class="info-box">
            <h3>🏠 Logement</h3>
            <p><strong>${inspection.lease.apartment.address}</strong></p>
            ${inspection.lease.apartment.complement ? `<p>${inspection.lease.apartment.complement}</p>` : ''}
            <p>${inspection.lease.apartment.zipCode} ${inspection.lease.apartment.city}</p>
        </div>
        <div class="info-box">
            <h3>👤 Locataire</h3>
            <p><strong>${inspection.lease.tenant.firstName} ${inspection.lease.tenant.lastName}</strong></p>
            <p>${inspection.lease.tenant.email}</p>
            ${inspection.lease.tenant.phone ? `<p>${inspection.lease.tenant.phone}</p>` : ''}
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width:30%">Pièce</th>
                <th style="width:20%">État</th>
                <th>Observations</th>
            </tr>
        </thead>
        <tbody>${roomsHtml}</tbody>
    </table>

    ${inspection.notes ? `
    <div class="notes-box">
        <h3>Observations générales</h3>
        <p style="white-space:pre-wrap;font-size:13px;">${inspection.notes}</p>
    </div>` : ''}

    <div class="signature">
        <div class="sig-box">
            <div class="sig-label">Signature du bailleur</div>
            <div class="sig-line"></div>
        </div>
        <div class="sig-box">
            <div class="sig-label">Signature du locataire</div>
            <div class="sig-line"></div>
        </div>
    </div>

    <div class="footer">
        Document généré par Rentmaestro le ${new Date().toLocaleDateString('fr-FR')} — État des lieux officiel
    </div>
</body>
</html>`;

    try {
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            headless: true,
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' } });
        await browser.close();

        const filename = `EDL_${isEntry ? 'Entree' : 'Sortie'}_${date.replace(/ /g, '_')}.pdf`;
        return new NextResponse(Buffer.from(pdfBuffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error('Erreur PDF état des lieux:', error);
        return new NextResponse('Erreur serveur', { status: 500 });
    }
}
