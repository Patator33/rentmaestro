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
                        apartment: true
                    }
                }
            }
        });

        if (!payment) throw new Error("Paiement introuvable");
        if (payment.status !== "PAID") throw new Error("La quittance ne peut être envoyée que pour un loyer payé.");
        if (!payment.lease.tenant.email) throw new Error("Le locataire n'a pas d'adresse email renseignée.");

        const html = generateQuittanceHtml(payment.lease, payment.period);
        const subject = `Quittance de loyer - ${getMonthYear(payment.period)} - Rentmaestro`;

        await sendEmail({
            to: payment.lease.tenant.email,
            subject,
            html
        });

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
        const amount = payment.amount.toFixed(2);

        const html = `
            <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
                <h2>Bonjour ${payment.lease.tenant.firstName},</h2>
                <p>Sauf erreur ou omission de notre part, il semblerait que le paiement de votre loyer pour la période de <strong>${formattedPeriod}</strong> soit toujours en attente.</p>
                <p>Le montant dû est de <strong>${amount} €</strong> pour le logement situé au ${payment.lease.apartment.address}, ${payment.lease.apartment.city}.</p>
                <p>Si vous avez déjà procédé au règlement, merci de ne pas tenir compte de cet email.</p>
                <p>Dans le cas contraire, nous vous invitons à régulariser la situation dans les meilleurs délais.</p>
                <br />
                <p>Cordialement,</p>
                <p><strong>Votre propriétaire</strong><br /><em>Via Rentmaestro</em></p>
            </div>
        `;

        const subject = `Rappel : Loyer en attente - ${formattedPeriod}`;

        await sendEmail({
            to: payment.lease.tenant.email,
            subject,
            html
        });

        return { success: true };
    } catch (error: any) {
        console.error("Erreur sendReminderEmail:", error);
        return { success: false, error: error.message || "Erreur lors de l'envoi de l'email" };
    }
}
