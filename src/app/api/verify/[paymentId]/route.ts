import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ paymentId: string }> }
) {
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
        return new NextResponse(renderHtml({
            valid: false,
            title: 'Quittance introuvable',
            message: 'Ce document ne correspond à aucune quittance valide dans notre système.',
        }), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    const monthName = format(new Date(payment.period), 'MMMM yyyy', { locale: fr });
    const paidAt = payment.paidAt
        ? format(new Date(payment.paidAt), 'dd MMMM yyyy', { locale: fr })
        : null;

    return new NextResponse(renderHtml({
        valid: true,
        title: 'Quittance authentique ✓',
        message: 'Ce document est authentique et enregistré dans Rentmaestro.',
        details: {
            tenant: `${payment.lease.tenant.firstName} ${payment.lease.tenant.lastName}`,
            apartment: `${payment.lease.apartment.address}, ${payment.lease.apartment.zipCode} ${payment.lease.apartment.city}`,
            period: monthName,
            amount: `${payment.amount.toFixed(2)} €`,
            paidAt: paidAt ?? 'Date non renseignée',
        }
    }), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

interface VerifyData {
    valid: boolean;
    title: string;
    message: string;
    details?: {
        tenant: string;
        apartment: string;
        period: string;
        amount: string;
        paidAt: string;
    };
}

function renderHtml(data: VerifyData): string {
    const color = data.valid ? '#16a34a' : '#dc2626';
    const bg = data.valid ? '#f0fdf4' : '#fef2f2';
    const border = data.valid ? '#bbf7d0' : '#fecaca';
    const icon = data.valid ? '✅' : '❌';

    const detailsHtml = data.details ? `
        <table style="width:100%;border-collapse:collapse;margin-top:1.5rem;">
            <tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:0.6rem 0;color:#6b7280;font-size:0.9rem;width:40%">Locataire</td>
                <td style="padding:0.6rem 0;font-weight:600">${data.details.tenant}</td>
            </tr>
            <tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:0.6rem 0;color:#6b7280;font-size:0.9rem">Logement</td>
                <td style="padding:0.6rem 0;font-weight:600">${data.details.apartment}</td>
            </tr>
            <tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:0.6rem 0;color:#6b7280;font-size:0.9rem">Période</td>
                <td style="padding:0.6rem 0;font-weight:600;text-transform:capitalize">${data.details.period}</td>
            </tr>
            <tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:0.6rem 0;color:#6b7280;font-size:0.9rem">Montant</td>
                <td style="padding:0.6rem 0;font-weight:600">${data.details.amount}</td>
            </tr>
            <tr>
                <td style="padding:0.6rem 0;color:#6b7280;font-size:0.9rem">Date de paiement</td>
                <td style="padding:0.6rem 0;font-weight:600">${data.details.paidAt}</td>
            </tr>
        </table>` : '';

    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vérification de quittance — Rentmaestro</title>
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f8fafc; display:flex; justify-content:center; align-items:center; min-height:100vh; padding:2rem; }
        .card { background:white; border-radius:16px; box-shadow:0 4px 24px rgba(0,0,0,0.08); max-width:500px; width:100%; padding:2.5rem; }
        .badge { display:inline-flex; align-items:center; gap:0.5rem; background:${bg}; color:${color}; border:1px solid ${border}; padding:0.6rem 1.2rem; border-radius:9999px; font-weight:700; font-size:1rem; margin-bottom:1.5rem; }
        h1 { font-size:1.5rem; color:#1e293b; margin-bottom:0.5rem; }
        .message { color:#64748b; font-size:0.95rem; margin-bottom:1rem; }
        .footer { margin-top:2rem; padding-top:1rem; border-top:1px solid #f1f5f9; text-align:center; font-size:0.8rem; color:#94a3b8; }
    </style>
</head>
<body>
    <div class="card">
        <div class="badge">${icon} ${data.valid ? 'Document vérifié' : 'Document invalide'}</div>
        <h1>${data.title}</h1>
        <p class="message">${data.message}</p>
        ${detailsHtml}
        <div class="footer">Rentmaestro — Système de gestion locative</div>
    </div>
</body>
</html>`;
}
