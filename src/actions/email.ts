'use server'

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { buildSigningPdf } from "@/lib/pdf-signing";
import { requireAuth } from "@/lib/session";
import { sendQuittanceEmailCore, sendReminderEmailCore } from "@/lib/rent-emails";

export async function sendQuittanceEmail(paymentId: string) {
    await requireAuth();
    return sendQuittanceEmailCore(paymentId);
}

export async function sendReminderEmail(leaseId: string, periodStr: string) {
    await requireAuth();
    return sendReminderEmailCore(leaseId, periodStr);
}

export async function sendSigningEmail(leaseId: string, docType: 'bail' | 'edl') {
    await requireAuth();
    try {
        const lease = await prisma.lease.findUnique({
            where: { id: leaseId },
            include: {
                tenant: true,
                apartment: { include: { documents: true } },
            },
        });
        if (!lease) throw new Error("Bail introuvable");
        if (!lease.tenant.email) throw new Error("Le locataire n'a pas d'adresse email.");

        const aptDocType = docType === 'bail' ? 'BAIL_TYPE' : 'ETAT_DES_LIEUX';
        const doc = lease.apartment.documents.find((d: any) => d.docType === aptDocType);
        if (!doc) throw new Error(docType === 'bail' ? "Aucun bail type déposé sur cet appartement." : "Aucun état des lieux déposé sur cet appartement.");

        // Build PDF with cover page containing tenant coordinates
        const pdfBuffer = await buildSigningPdf(doc.url, lease, docType);

        const baseUrl = process.env.APP_BASE_URL || 'https://rentmaestro.nico33.net';
        const portalLink = lease.tenant.portalToken
            ? `<p style="margin-top:1rem">Retrouvez vos documents sur votre <a href="${baseUrl}/portal/${lease.tenant.portalToken}" style="color:#2b8cee;">espace locataire →</a></p>`
            : '';

        const isBail = docType === 'bail';
        const aptAddress = `${lease.apartment.address}, ${lease.apartment.zipCode} ${lease.apartment.city}`;

        const subject = isBail
            ? `Bail de location à signer — ${lease.apartment.name || lease.apartment.address}`
            : `État des lieux — ${lease.apartment.name || lease.apartment.address}`;

        const intro = isBail
            ? `Veuillez trouver en pièce jointe le bail de location. Merci de le <strong>signer et nous le retourner</strong> dès que possible.`
            : `Veuillez trouver en pièce jointe l'état des lieux. Merci de le <strong>signer et nous le retourner</strong> dès que possible.`;

        const html = `
            <div style="font-family:sans-serif;color:#333;line-height:1.6;max-width:560px">
                <h2>Bonjour ${lease.tenant.firstName},</h2>
                <p>${intro}</p>
                <table style="width:100%;border-collapse:collapse;margin:1rem 0;font-size:0.9rem;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
                    <tr style="background:#f8fafc"><td style="padding:0.5rem 0.75rem;color:#64748b;width:140px;font-weight:600">Logement</td><td style="padding:0.5rem 0.75rem;color:#1e293b">${aptAddress}</td></tr>
                    ${isBail ? `
                    <tr><td style="padding:0.5rem 0.75rem;color:#64748b;font-weight:600">Loyer CC</td><td style="padding:0.5rem 0.75rem;font-weight:700;color:#2b8cee">${(lease.rentAmount + lease.chargesAmount).toFixed(2)} €</td></tr>
                    <tr style="background:#f8fafc"><td style="padding:0.5rem 0.75rem;color:#64748b;font-weight:600">Début</td><td style="padding:0.5rem 0.75rem;color:#1e293b">${new Date(lease.startDate).toLocaleDateString('fr-FR')}</td></tr>
                    ${lease.depositAmount ? `<tr><td style="padding:0.5rem 0.75rem;color:#64748b;font-weight:600">Caution</td><td style="padding:0.5rem 0.75rem;color:#1e293b">${lease.depositAmount.toFixed(2)} €</td></tr>` : ''}
                    ` : `
                    <tr><td style="padding:0.5rem 0.75rem;color:#64748b;font-weight:600">Date d'entrée</td><td style="padding:0.5rem 0.75rem;color:#1e293b">${new Date(lease.startDate).toLocaleDateString('fr-FR')}</td></tr>
                    `}
                </table>
                ${portalLink}
                <br />
                <p>Cordialement,</p>
                <p><strong>Céline et Nicolas</strong><br /><em>Via Rentmaestro</em></p>
            </div>
        `;

        const filename = isBail
            ? `bail-${lease.tenant.lastName.toLowerCase()}-${lease.apartment.city.toLowerCase()}.pdf`
            : `etat-des-lieux-${lease.tenant.lastName.toLowerCase()}-${lease.apartment.city.toLowerCase()}.pdf`;

        const recipients = [lease.tenant.email];
        if (lease.tenant.coTenantEmail) recipients.push(lease.tenant.coTenantEmail);

        await sendEmail({
            to: recipients.join(','),
            subject,
            html,
            attachments: [{ filename, content: pdfBuffer, contentType: 'application/pdf' }],
        });
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
    await requireAuth();
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
