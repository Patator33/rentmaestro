'use server'

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { generateQuittanceHtml } from "@/lib/quittance";
import { revalidatePath } from "next/cache";

function getMonthYear(date: Date): string {
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export async function sendQuittanceEmail(paymentId: string) {
    try {
        const payment = await prisma.rentPayment.findUnique({
            where: { id: paymentId },
            include: {
                lease: {
                    include: {
                        tenant: true,
                        apartment: { include: { company: true } }
                    }
                }
            }
        });

        if (!payment) throw new Error("Paiement introuvable");
        if (payment.status !== "PAID") throw new Error("La quittance ne peut être envoyée que pour un loyer payé.");
        if (!payment.lease.tenant.email) throw new Error("Le locataire n'a pas d'adresse email renseignée.");

        const baseUrl = process.env.APP_BASE_URL || 'https://rentmaestro.nico33.net';
        const verifyUrl = `${baseUrl}/api/verify/${paymentId}`;
        const html = generateQuittanceHtml(payment.lease, payment.period, verifyUrl);
        const subject = `Quittance de loyer - ${getMonthYear(payment.period)} - Rentmaestro`;

        await sendEmail({
            to: payment.lease.tenant.email,
            subject,
            html
        });

        // Save timestamp
        await prisma.rentPayment.update({
            where: { id: paymentId },
            data: { receiptSentAt: new Date() }
        });

        revalidatePath("/rents");
        return { success: true };
    } catch (error: any) {
        console.error("Erreur sendQuittanceEmail:", error);
        return { success: false, error: error.message || "Erreur lors de l'envoi de l'email" };
    }
}

export async function sendReminderEmail(leaseId: string, periodStr: string) {
    if (!leaseId || !periodStr) return { success: false, error: "Données invalides." };

    try {
        const period = new Date(periodStr);
        let payment = await prisma.rentPayment.findFirst({
            where: { leaseId, period },
            include: { lease: { include: { tenant: true, apartment: true } } }
        });

        if (!payment) {
            const lease = await prisma.lease.findUnique({
                where: { id: leaseId },
                include: { tenant: true, apartment: true }
            });
            if (!lease) throw new Error("Bail introuvable");

            payment = await prisma.rentPayment.create({
                data: { leaseId, period, amount: lease.rentAmount + lease.chargesAmount, status: "PENDING" },
                include: { lease: { include: { tenant: true, apartment: true } } }
            });
        }
        if (payment.status === "PAID") throw new Error("Ce loyer est déjà payé.");
        if (!payment.lease.tenant.email) throw new Error("Le locataire n'a pas d'adresse email renseignée.");

        const formattedPeriod = getMonthYear(payment.period);
        const remainingAmount = payment.status === 'PARTIAL' && (payment as any).paidAmount
            ? (payment.amount - (payment as any).paidAmount).toFixed(2)
            : payment.amount.toFixed(2);
        const amount = remainingAmount;

        const baseUrl = process.env.APP_BASE_URL || 'https://rentmaestro.nico33.net';
        const portalLink = payment.lease.tenant.portalToken
            ? `<p>Vous pouvez consulter votre espace locataire en ligne : <a href="${baseUrl}/portal/${payment.lease.tenant.portalToken}" style="color:#2b8cee;">Mon espace locataire →</a></p>`
            : '';

        const html = `
            <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
                <h2>Bonjour ${payment.lease.tenant.firstName},</h2>
                <p>Sauf erreur ou omission de notre part, il semblerait que le paiement de votre loyer pour la période de <strong>${formattedPeriod}</strong> soit toujours en attente.</p>
                <p>Le montant dû est de <strong>${amount} €</strong> pour le logement situé au ${payment.lease.apartment.address}, ${payment.lease.apartment.city}.</p>
                <p>Si vous avez déjà procédé au règlement, merci de ne pas tenir compte de cet email.</p>
                <p>Dans le cas contraire, nous vous invitons à régulariser la situation dans les meilleurs délais.</p>
                ${portalLink}
                <br />
                <p>Cordialement,</p>
                <p><strong>Céline et Nicolas</strong><br /><em>Via Rentmaestro</em></p>
            </div>
        `;

        const subject = `Rappel : Loyer en attente - ${formattedPeriod}`;

        await sendEmail({
            to: payment.lease.tenant.email,
            subject,
            html
        });

        // Save timestamp
        await prisma.rentPayment.update({
            where: { id: payment.id },
            data: { sentAt: new Date() }
        });

        revalidatePath("/rents");
        return { success: true };
    } catch (error: any) {
        console.error("Erreur sendReminderEmail:", error);
        return { success: false, error: error.message || "Erreur lors de l'envoi de l'email" };
    }
}

export async function sendSigningEmail(leaseId: string, docType: 'bail' | 'edl') {
    try {
        const lease = await prisma.lease.findUnique({
            where: { id: leaseId },
            include: {
                tenant: true,
                apartment: {
                    include: { documents: true },
                },
            },
        });
        if (!lease) throw new Error("Bail introuvable");
        if (!lease.tenant.email) throw new Error("Le locataire n'a pas d'adresse email.");

        const aptDocType = docType === 'bail' ? 'BAIL_TYPE' : 'ETAT_DES_LIEUX';
        const doc = lease.apartment.documents.find((d: any) => d.docType === aptDocType);
        if (!doc) throw new Error(docType === 'bail' ? "Aucun bail type déposé sur cet appartement." : "Aucun état des lieux déposé sur cet appartement.");

        const baseUrl = process.env.APP_BASE_URL || 'https://rentmaestro.nico33.net';
        const docUrl = doc.url.startsWith('http') ? doc.url : `${baseUrl}${doc.url}`;
        const portalLink = lease.tenant.portalToken
            ? `<p style="margin-top:1rem">Retrouvez tous vos documents sur votre <a href="${baseUrl}/portal/${lease.tenant.portalToken}" style="color:#2b8cee;">espace locataire →</a></p>`
            : '';

        const isBail = docType === 'bail';
        const tenantName = `${lease.tenant.firstName} ${lease.tenant.lastName}`;
        const aptAddress = `${lease.apartment.address}, ${lease.apartment.zipCode} ${lease.apartment.city}`;

        const infoBlock = isBail ? `
            <table style="width:100%;border-collapse:collapse;margin:1rem 0;font-size:0.9rem;">
                <tr><td style="padding:0.3rem 0;color:#64748b;width:140px">Locataire</td><td style="font-weight:600;color:#1e293b">${tenantName}</td></tr>
                <tr><td style="padding:0.3rem 0;color:#64748b">Logement</td><td style="color:#1e293b">${aptAddress}</td></tr>
                <tr><td style="padding:0.3rem 0;color:#64748b">Loyer HC</td><td style="color:#1e293b">${lease.rentAmount.toFixed(2)} €</td></tr>
                <tr><td style="padding:0.3rem 0;color:#64748b">Charges</td><td style="color:#1e293b">${lease.chargesAmount.toFixed(2)} €</td></tr>
                <tr><td style="padding:0.3rem 0;color:#64748b">Loyer CC</td><td style="font-weight:700;color:#2b8cee">${(lease.rentAmount + lease.chargesAmount).toFixed(2)} €</td></tr>
                <tr><td style="padding:0.3rem 0;color:#64748b">Début du bail</td><td style="color:#1e293b">${new Date(lease.startDate).toLocaleDateString('fr-FR')}</td></tr>
                ${lease.depositAmount ? `<tr><td style="padding:0.3rem 0;color:#64748b">Caution</td><td style="color:#1e293b">${lease.depositAmount.toFixed(2)} €</td></tr>` : ''}
            </table>
        ` : `
            <table style="width:100%;border-collapse:collapse;margin:1rem 0;font-size:0.9rem;">
                <tr><td style="padding:0.3rem 0;color:#64748b;width:140px">Locataire</td><td style="font-weight:600;color:#1e293b">${tenantName}</td></tr>
                <tr><td style="padding:0.3rem 0;color:#64748b">Logement</td><td style="color:#1e293b">${aptAddress}</td></tr>
                <tr><td style="padding:0.3rem 0;color:#64748b">Date d'entrée</td><td style="color:#1e293b">${new Date(lease.startDate).toLocaleDateString('fr-FR')}</td></tr>
            </table>
        `;

        const subject = isBail
            ? `Bail de location à signer — ${lease.apartment.name || lease.apartment.address}`
            : `État des lieux — ${lease.apartment.name || lease.apartment.address}`;

        const intro = isBail
            ? `Veuillez trouver ci-dessous le bail de location relatif à votre logement. Merci de le <strong>signer et nous le retourner</strong> dès que possible.`
            : `Veuillez trouver ci-dessous l'état des lieux de votre logement. Merci de le <strong>signer et nous le retourner</strong> dès que possible.`;

        const html = `
            <div style="font-family:sans-serif;color:#333;line-height:1.6;max-width:560px">
                <h2>Bonjour ${lease.tenant.firstName},</h2>
                <p>${intro}</p>
                ${infoBlock}
                <a href="${docUrl}" style="display:inline-block;padding:0.7rem 1.4rem;background:#2b8cee;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:0.95rem;">
                    📄 Télécharger le document →
                </a>
                <p style="color:#64748b;font-size:0.82rem;margin-top:0.4rem">${docUrl}</p>
                ${portalLink}
                <br />
                <p>Cordialement,</p>
                <p><strong>Céline et Nicolas</strong><br /><em>Via Rentmaestro</em></p>
            </div>
        `;

        const recipients = [lease.tenant.email];
        if (lease.tenant.coTenantEmail) recipients.push(lease.tenant.coTenantEmail);

        await sendEmail({ to: recipients.join(','), subject, html });
        return { success: true };
    } catch (error: any) {
        console.error("Erreur sendSigningEmail:", error);
        return { success: false, error: error.message || "Erreur lors de l'envoi" };
    }
}

export interface DocToSend {
    name: string;
    url: string;
    docType: string;
}

export async function sendDocumentsEmail(leaseId: string, selectedDocs: DocToSend[]) {
    if (!leaseId || selectedDocs.length === 0) {
        return { success: false, error: "Aucun document sélectionné." };
    }

    try {
        const lease = await prisma.lease.findUnique({
            where: { id: leaseId },
            include: { tenant: true, apartment: true },
        });
        if (!lease) throw new Error("Bail introuvable");
        if (!lease.tenant.email) throw new Error("Le locataire n'a pas d'adresse email.");

        const baseUrl = process.env.APP_BASE_URL || 'https://rentmaestro.nico33.net';

        const docLines = selectedDocs.map(d =>
            `<li style="margin:0.4rem 0"><a href="${baseUrl}${encodeURI(d.url)}" style="color:#2B8CEE">${d.name}</a></li>`
        ).join('');

        const portalLink = lease.tenant.portalToken
            ? `<p>Retrouvez tous vos documents sur votre <a href="${baseUrl}/portal/${lease.tenant.portalToken}" style="color:#2b8cee;">espace locataire →</a></p>`
            : '';

        const html = `
            <div style="font-family:sans-serif;color:#333;line-height:1.6;max-width:560px">
                <h2>Bonjour ${lease.tenant.firstName},</h2>
                <p>Veuillez trouver ci-dessous les documents relatifs à votre logement situé au <strong>${lease.apartment.address}, ${lease.apartment.city}</strong> :</p>
                <ul style="padding-left:1.25rem">${docLines}</ul>
                <p>N'hésitez pas à nous contacter pour toute question.</p>
                ${portalLink}
                <br />
                <p>Cordialement,</p>
                <p><strong>Céline et Nicolas</strong><br /><em>Via Rentmaestro</em></p>
            </div>
        `;

        const recipients = [lease.tenant.email];
        if (lease.tenant.coTenantEmail) recipients.push(lease.tenant.coTenantEmail);

        await sendEmail({
            to: recipients.join(','),
            subject: `Documents — ${lease.apartment.name || lease.apartment.address}`,
            html,
        });

        return { success: true };
    } catch (error: any) {
        console.error("Erreur sendDocumentsEmail:", error);
        return { success: false, error: error.message || "Erreur lors de l'envoi" };
    }
}
