import { quarterLabel } from '@/lib/irl';

const PROPRIETAIRE_NOM_PROPRE = 'Céline et Nicolas Rigaud';
const PROPRIETAIRE_ADRESSE = '2 Rue Max Linder, 33240 Saint André de Cubzac';
const LIEU_SIGNATURE = 'Saint André de Cubzac';

export interface IrlLetterData {
    bailleurName: string;
    bailleurAddress: string;
    tenantName: string;
    apartmentAddress: string;
    oldRent: number;
    newRent: number;
    charges: number;
    baseQuarter: string;
    baseIndex: number;
    newQuarter: string;
    newIndex: number;
    effectiveDate: Date;
}

function fmt(n: number): string {
    return n.toFixed(2);
}

function dateFR(d: Date): string {
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function defaultBailleur(company?: { name?: string | null; address?: string | null } | null) {
    return {
        name: company?.name || PROPRIETAIRE_NOM_PROPRE,
        address: company?.address || PROPRIETAIRE_ADRESSE,
    };
}

export function generateIrlLetterHtml(d: IrlLetterData): string {
    const increase = Math.round((d.newRent - d.oldRent) * 100) / 100;
    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Révision de loyer (IRL)</title>
<style>
    @page { size: A4; margin: 2.5cm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica','Arial',sans-serif; font-size: 14px; color: #1a1a1a; line-height: 1.7; }
    .head { display: flex; justify-content: space-between; margin-bottom: 3rem; }
    .block { font-size: 13px; }
    .block strong { display: block; font-size: 14px; margin-bottom: 0.25rem; }
    .right { text-align: right; }
    .object { font-weight: 700; margin: 2rem 0 1rem; }
    .table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
    .table td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #e0e0e0; }
    .table td:last-child { text-align: right; font-weight: 600; }
    .total td { border-top: 2px solid #2563eb; color: #2563eb; font-weight: 700; }
    .sig { margin-top: 3rem; text-align: right; }
</style>
</head>
<body>
    <div class="head">
        <div class="block">
            <strong>${d.bailleurName}</strong>
            ${d.bailleurAddress}
        </div>
        <div class="block right">
            <strong>${d.tenantName}</strong>
            ${d.apartmentAddress}
        </div>
    </div>

    <p class="right">À ${LIEU_SIGNATURE}, le ${dateFR(new Date())}</p>

    <p class="object">Objet : Révision annuelle du loyer (indice de référence des loyers)</p>

    <p>Madame, Monsieur,</p>

    <p style="margin-top:1rem;">
        Conformément aux dispositions de votre contrat de location portant sur le logement
        situé <strong>${d.apartmentAddress}</strong> et à l'article 17-1 de la loi du 6 juillet 1989,
        nous procédons à la révision annuelle de votre loyer sur la base de l'indice de référence
        des loyers (IRL) publié par l'INSEE.
    </p>

    <table class="table">
        <tr><td>IRL de référence (${quarterLabel(d.baseQuarter)})</td><td>${d.baseIndex}</td></tr>
        <tr><td>Nouvel IRL (${quarterLabel(d.newQuarter)})</td><td>${d.newIndex}</td></tr>
        <tr><td>Loyer hors charges actuel</td><td>${fmt(d.oldRent)} €</td></tr>
        <tr class="total"><td>Nouveau loyer hors charges</td><td>${fmt(d.newRent)} €</td></tr>
    </table>

    <p>
        Le calcul s'effectue ainsi : ${fmt(d.oldRent)} € × ${d.newIndex} / ${d.baseIndex} =
        <strong>${fmt(d.newRent)} €</strong> (soit une variation de ${fmt(increase)} €).
    </p>

    <p style="margin-top:1rem;">
        À compter du <strong>${dateFR(d.effectiveDate)}</strong>, le montant de votre loyer sera donc :
    </p>
    <table class="table">
        <tr><td>Loyer hors charges</td><td>${fmt(d.newRent)} €</td></tr>
        <tr><td>Provision pour charges</td><td>${fmt(d.charges)} €</td></tr>
        <tr class="total"><td>Loyer charges comprises</td><td>${fmt(d.newRent + d.charges)} €</td></tr>
    </table>

    <p style="margin-top:1rem;">
        Nous restons à votre disposition pour toute information complémentaire et vous prions d'agréer,
        Madame, Monsieur, l'expression de nos salutations distinguées.
    </p>

    <div class="sig">
        <p>${d.bailleurName}</p>
    </div>
</body>
</html>`;
}
