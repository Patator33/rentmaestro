import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function formatDateFR(date: Date): string {
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function getMonthYear(date: Date): string {
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

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
        const html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Quittance de Loyer - ${getMonthYear(period)}</title>
    <style>
        @page { size: A4; margin: 2cm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 14px; color: #1a1a1a; line-height: 1.6; }
        .header { text-align: center; border-bottom: 3px solid #2b8cee; padding-bottom: 1.5rem; margin-bottom: 2rem; }
        .header h1 { font-size: 24px; color: #2b8cee; margin-bottom: 0.25rem; }
        .header p { font-size: 13px; color: #666; }
        .section { margin-bottom: 1.5rem; }
        .section-title { font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; font-weight: 700; margin-bottom: 0.5rem; border-bottom: 1px solid #eee; padding-bottom: 0.25rem; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; }
        .info-box { padding: 1rem; background: #f8f9fa; border-radius: 8px; }
        .info-box h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 0.5rem; }
        .info-box p { font-size: 14px; }
        .amount-box { text-align: center; padding: 1.5rem; background: #eef5fd; border: 2px solid #2b8cee; border-radius: 12px; margin: 2rem 0; }
        .amount-box .total { font-size: 32px; font-weight: 700; color: #2b8cee; }
        .amount-box .label { font-size: 13px; color: #666; margin-top: 0.25rem; }
        .detail-table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
        .detail-table th, .detail-table td { text-align: left; padding: 0.75rem; border-bottom: 1px solid #eee; }
        .detail-table th { font-size: 12px; text-transform: uppercase; color: #888; }
        .detail-table td:last-child { text-align: right; font-weight: 600; }
        .detail-table tfoot td { border-top: 2px solid #2b8cee; font-weight: 700; color: #2b8cee; }
        .signature { margin-top: 3rem; display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
        .signature-box { padding-top: 1rem; }
        .signature-box .sig-label { font-size: 12px; color: #888; margin-bottom: 0.5rem; }
        .signature-box .sig-line { border-bottom: 1px solid #ccc; height: 4rem; }
        .footer { margin-top: 3rem; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 1rem; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>QUITTANCE DE LOYER</h1>
        <p>${getMonthYear(period)}</p>
    </div>

    <div class="info-grid">
        <div class="info-box">
            <h3>🏠 Bailleur</h3>
            <p><strong>Rentmaestro</strong></p>
            <p>${lease.apartment.address}</p>
            ${lease.apartment.complement ? `<p>${lease.apartment.complement}</p>` : ''}
            <p>${lease.apartment.zipCode} ${lease.apartment.city}</p>
        </div>
        <div class="info-box">
            <h3>👤 Locataire</h3>
            <p><strong>${lease.tenant.firstName} ${lease.tenant.lastName}</strong></p>
            <p>${lease.tenant.email}</p>
            ${lease.tenant.phone ? `<p>${lease.tenant.phone}</p>` : ''}
        </div>
    </div>

    <div class="section">
        <div class="section-title">Détail du bien</div>
        <p>${lease.apartment.name || lease.apartment.address}, ${lease.apartment.city}</p>
        <p>Bail en cours depuis le ${formatDateFR(new Date(lease.startDate))}</p>
    </div>

    <div class="amount-box">
        <div class="total">${totalAmount.toFixed(2)} €</div>
        <div class="label">Montant acquitté pour ${getMonthYear(period)}</div>
    </div>

    <table class="detail-table">
        <thead>
            <tr><th>Désignation</th><th style="text-align:right">Montant</th></tr>
        </thead>
        <tbody>
            <tr><td>Loyer (hors charges)</td><td>${lease.rentAmount.toFixed(2)} €</td></tr>
            <tr><td>Charges locatives</td><td>${lease.chargesAmount.toFixed(2)} €</td></tr>
        </tbody>
        <tfoot>
            <tr><td>Total</td><td>${totalAmount.toFixed(2)} €</td></tr>
        </tfoot>
    </table>

    <p style="margin-top: 1.5rem; font-style: italic; font-size: 13px; color: #555;">
        Je soussigné, propriétaire du logement désigné ci-dessus, déclare avoir reçu de
        <strong>${lease.tenant.firstName} ${lease.tenant.lastName}</strong>
        la somme de <strong>${totalAmount.toFixed(2)} euros</strong>
        au titre du paiement du loyer et des charges pour la période de
        <strong>${getMonthYear(period)}</strong>
        et lui en donne quittance, sous réserve de tous mes droits.
    </p>

    <div class="signature">
        <div class="signature-box">
            <div class="sig-label">Fait à _______________, le ${formatDateFR(new Date())}</div>
        </div>
        <div class="signature-box">
            <div class="sig-label">Signature du bailleur</div>
            <div class="sig-line"></div>
        </div>
    </div>

    <div class="footer">
        Document généré par Rentmaestro le ${formatDateFR(new Date())} — Cette quittance est un document officiel attestant du paiement du loyer.
    </div>
</body>
</html>`;

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
