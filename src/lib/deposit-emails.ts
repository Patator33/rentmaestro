import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const EUR = (n: number) =>
    n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

function buildDepositReturnHtml(opts: {
    firstName: string;
    address: string;
    depositAmount: number;
    returnedAmount: number;
    note: string | null;
}): string {
    const { firstName, address, depositAmount, returnedAmount, note } = opts;
    const withheld = Math.max(0, depositAmount - returnedAmount);
    const incomplete = withheld > 0.005;

    const breakdown = `
        <table style="border-collapse:collapse;margin:12px 0;font-size:15px;">
            <tr>
                <td style="padding:4px 16px 4px 0;color:#555;">Dépôt de garantie initial</td>
                <td style="padding:4px 0;text-align:right;"><strong>${EUR(depositAmount)}</strong></td>
            </tr>
            <tr>
                <td style="padding:4px 16px 4px 0;color:#555;">Montant restitué</td>
                <td style="padding:4px 0;text-align:right;"><strong>${EUR(returnedAmount)}</strong></td>
            </tr>
            ${incomplete ? `<tr>
                <td style="padding:4px 16px 4px 0;color:#b45309;">Montant retenu</td>
                <td style="padding:4px 0;text-align:right;color:#b45309;"><strong>${EUR(withheld)}</strong></td>
            </tr>` : ''}
        </table>`;

    const noteBlock = incomplete
        ? `<div style="margin:16px 0;padding:12px 16px;background:#fef3c7;border-left:4px solid #f59e0b;border-radius:4px;">
                <p style="margin:0 0 4px;font-weight:600;color:#92400e;">Motif de la retenue</p>
                <p style="margin:0;color:#78350f;white-space:pre-wrap;">${note ? escapeHtml(note) : 'Non précisé.'}</p>
           </div>`
        : '';

    const intro = incomplete
        ? `<p>Nous avons procédé à la restitution partielle de votre dépôt de garantie pour le logement situé au ${escapeHtml(address)}.</p>`
        : `<p>Nous avons procédé à la restitution intégrale de votre dépôt de garantie pour le logement situé au ${escapeHtml(address)}.</p>`;

    return `
        <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
            <h2>Bonjour ${escapeHtml(firstName)},</h2>
            ${intro}
            ${breakdown}
            ${noteBlock}
            <p>Le versement correspondant vous a été adressé par virement bancaire.</p>
            <p>Pour toute question relative à ce décompte, n'hésitez pas à nous contacter.</p>
            <br />
            <p>Cordialement,</p>
            <p><strong>Céline et Nicolas</strong><br /><em>Via Rentmaestro</em></p>
        </div>
    `;
}

function escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c] as string));
}

/**
 * Cœur de l'envoi de l'email de restitution du dépôt de garantie — sans contrôle
 * d'auth. Appelé depuis la Server Action `returnDeposit` (protégée par `requireAuth`).
 * Ne jamais throw : renvoie toujours { success, error? }.
 */
export async function sendDepositReturnEmailCore(leaseId: string) {
    try {
        const lease = await prisma.lease.findUnique({
            where: { id: leaseId },
            include: { tenant: true, apartment: true },
        });

        if (!lease) return { success: false, error: "Bail introuvable" };
        if (lease.depositStatus !== 'RETURNED' && lease.depositStatus !== 'DEDUCTED') {
            return { success: false, error: "La caution n'est pas marquée comme restituée." };
        }
        if (lease.depositReturnEmailSentAt) {
            return { success: false, error: "Email de restitution déjà envoyé." };
        }
        if (!lease.tenant.email) {
            return { success: false, error: "Le locataire n'a pas d'adresse email renseignée." };
        }

        const depositAmount = lease.depositAmount ?? 0;
        const returnedAmount = lease.depositReturnedAmount ?? 0;

        const html = buildDepositReturnHtml({
            firstName: lease.tenant.firstName,
            address: `${lease.apartment.address}, ${lease.apartment.zipCode ?? ''} ${lease.apartment.city}`.trim(),
            depositAmount,
            returnedAmount,
            note: lease.depositReturnNote,
        });

        await sendEmail({
            to: lease.tenant.email,
            subject: "Restitution de votre dépôt de garantie — Rentmaestro",
            html,
        });

        await prisma.lease.update({
            where: { id: leaseId },
            data: { depositReturnEmailSentAt: new Date() },
        });

        return { success: true };
    } catch (error: any) {
        console.error("Erreur sendDepositReturnEmail:", error);
        return { success: false, error: error.message || "Erreur lors de l'envoi de l'email" };
    }
}
