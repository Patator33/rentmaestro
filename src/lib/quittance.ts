interface Company {
    name: string;
    address: string | null;
}

interface Apartment {
    address: string;
    complement: string | null;
    zipCode: string;
    city: string;
    name: string | null;
    company: Company | null;
}

interface Tenant {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    coTenantFirstName: string | null;
    coTenantLastName: string | null;
}

interface Lease {
    rentAmount: number;
    chargesAmount: number;
    startDate: Date;
    apartment: Apartment;
    tenant: Tenant;
}

const PROPRIETAIRE_NOM_PROPRE = 'Céline et Nicolas Rigaud';
const PROPRIETAIRE_ADRESSE = '2 Rue Max Linder, 33240 Saint André de Cubzac';
const LIEU_SIGNATURE = 'Saint André de Cubzac';

function formatDateFR(date: Date): string {
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function getMonthYear(date: Date): string {
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function getBailleurName(apartment: Apartment): string {
    return apartment.company?.name || PROPRIETAIRE_NOM_PROPRE;
}

function getBailleurAddress(apartment: Apartment): string {
    return apartment.company?.address || PROPRIETAIRE_ADRESSE;
}

function getFullAddress(apartment: Apartment): string {
    const parts = [apartment.address];
    if (apartment.complement) parts.push(apartment.complement);
    parts.push(`${apartment.zipCode} ${apartment.city}`);
    return parts.join(', ');
}

export function generateQuittanceHtml(lease: Lease, period: Date, verifyUrl?: string, paidAmount?: number): string {
    const refTotal = lease.rentAmount + lease.chargesAmount;
    const totalAmount = paidAmount ?? refTotal;
    // Proportional breakdown when using a payment override
    const displayRent = refTotal > 0 && paidAmount !== undefined
        ? Math.round(totalAmount * lease.rentAmount / refTotal * 100) / 100
        : lease.rentAmount;
    const displayCharges = paidAmount !== undefined ? totalAmount - displayRent : lease.chargesAmount;
    const bailleurName = getBailleurName(lease.apartment);
    const bailleurAddress = getBailleurAddress(lease.apartment);
    const fullAddress = getFullAddress(lease.apartment);

    const qrBlock = verifyUrl ? `
    <div class="qr-block">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(verifyUrl)}" alt="QR Code Vérification" />
        <div>
            <strong>Vérifier l'authenticité de cette quittance</strong>
            <p>Scannez ce QR code ou rendez-vous sur :</p>
            <p style="word-break:break-all;">${verifyUrl}</p>
        </div>
    </div>` : '';

    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Quittance de Loyer - ${getMonthYear(period)}</title>
    <style>
        @page { size: A4; margin: 2cm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 14px; color: #1a1a1a; line-height: 1.6; }
        .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 1.5rem; margin-bottom: 2rem; }
        .header h1 { font-size: 24px; color: #2563eb; margin-bottom: 0.25rem; }
        .header p { font-size: 13px; color: #666; }
        .section { margin-bottom: 1.5rem; }
        .section-title { font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; font-weight: 700; margin-bottom: 0.5rem; border-bottom: 1px solid #e0eaff; padding-bottom: 0.25rem; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; }
        .info-box { padding: 1rem; background: #eff6ff; border-radius: 8px; border-left: 3px solid #2563eb; }
        .info-box h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #3b82f6; margin-bottom: 0.5rem; }
        .info-box p { font-size: 14px; }
        .amount-box { text-align: center; padding: 1.5rem; background: #eff6ff; border: 2px solid #2563eb; border-radius: 12px; margin: 2rem 0; }
        .amount-box .total { font-size: 32px; font-weight: 700; color: #2563eb; }
        .amount-box .label { font-size: 13px; color: #666; margin-top: 0.25rem; }
        .detail-table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
        .detail-table th, .detail-table td { text-align: left; padding: 0.75rem; border-bottom: 1px solid #e0eaff; }
        .detail-table th { font-size: 12px; text-transform: uppercase; color: #888; background: #f0f7ff; }
        .detail-table td:last-child { text-align: right; font-weight: 600; }
        .detail-table tfoot td { border-top: 2px solid #2563eb; font-weight: 700; color: #2563eb; }
        .signature { margin-top: 3rem; display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
        .signature-box { padding-top: 1rem; }
        .signature-box .sig-label { font-size: 12px; color: #555; margin-bottom: 0.5rem; }
        .signature-box .sig-name { font-size: 13px; font-weight: 700; color: #1a1a1a; margin-top: 0.5rem; }
        .signature-box .sig-line { border-bottom: 1px solid #aaa; height: 4rem; margin-top: 0.5rem; }
        .footer { margin-top: 3rem; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #e0eaff; padding-top: 1rem; }
        .qr-block { display: flex; align-items: center; gap: 1rem; margin-top: 2rem; padding: 1rem; background: #f0f7ff; border-radius: 8px; border: 1px solid #bfdbfe; }
        .qr-block img { width: 80px; height: 80px; flex-shrink: 0; }
        .qr-block p { font-size: 11px; color: #666; line-height: 1.5; }
        .qr-block strong { font-size: 12px; color: #333; display: block; margin-bottom: 0.25rem; }
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
            <p><strong>${bailleurName}</strong></p>
            <p style="margin-top: 0.25rem; font-size: 13px; color: #555;">${bailleurAddress}</p>
        </div>
        <div class="info-box">
            <h3>👤 Locataire</h3>
            <p><strong>${lease.tenant.firstName} ${lease.tenant.lastName}</strong></p>
            ${lease.tenant.coTenantFirstName && lease.tenant.coTenantLastName
                ? `<p><strong>${lease.tenant.coTenantFirstName} ${lease.tenant.coTenantLastName}</strong></p>`
                : ''}
        </div>
    </div>

    <div class="section">
        <div class="section-title">Détail du bien loué</div>
        <p>${fullAddress}</p>
        <p style="margin-top: 0.25rem; color: #555; font-size: 13px;">Bail en cours depuis le ${formatDateFR(new Date(lease.startDate))}</p>
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
            <tr><td>Loyer (hors charges)</td><td>${displayRent.toFixed(2)} €</td></tr>
            <tr><td>Charges locatives</td><td>${displayCharges.toFixed(2)} €</td></tr>
        </tbody>
        <tfoot>
            <tr><td>Total</td><td>${totalAmount.toFixed(2)} €</td></tr>
        </tfoot>
    </table>

    <p style="margin-top: 1.5rem; font-style: italic; font-size: 13px; color: #555;">
        Je soussigné(e), bailleur du logement désigné ci-dessus, déclare avoir reçu de
        <strong>${lease.tenant.firstName} ${lease.tenant.lastName}${lease.tenant.coTenantFirstName && lease.tenant.coTenantLastName ? ` et ${lease.tenant.coTenantFirstName} ${lease.tenant.coTenantLastName}` : ''}</strong>
        la somme de <strong>${totalAmount.toFixed(2)} euros</strong>
        au titre du paiement du loyer et des charges pour la période de
        <strong>${getMonthYear(period)}</strong>
        et lui en donne quittance, sous réserve de tous mes droits.
    </p>

    <div class="signature">
        <div class="signature-box">
            <div class="sig-label">Fait à ${LIEU_SIGNATURE}, le ${formatDateFR(new Date())}</div>
        </div>
        <div class="signature-box">
            <div class="sig-label">Signature du bailleur</div>
            <div class="sig-name">${bailleurName}</div>
            <div class="sig-line"></div>
        </div>
    </div>

    ${qrBlock}

    <div class="footer">
        Document généré par Rentmaestro le ${formatDateFR(new Date())} — Cette quittance est un document officiel attestant du paiement du loyer.
    </div>
</body>
</html>`;
}
