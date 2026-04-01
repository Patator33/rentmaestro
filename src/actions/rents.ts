'use server'

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { notifyN8n } from "@/lib/n8n";

export async function markRentAsPaid(leaseId: string, periodStr: string, paidAmount: number) {
    if (!leaseId || !periodStr || isNaN(paidAmount) || paidAmount <= 0) {
        throw new Error("Données de paiement invalides.");
    }

    const period = new Date(periodStr);

    try {
        const existing = await prisma.rentPayment.findFirst({
            where: { leaseId, period }
        });

        // Determine expected full amount
        let expectedAmount: number;
        if (existing) {
            expectedAmount = existing.amount;
        } else {
            const lease = await prisma.lease.findUnique({ where: { id: leaseId } });
            if (!lease) throw new Error("Bail introuvable.");
            expectedAmount = lease.rentAmount + lease.chargesAmount;
        }

        const isPartial = paidAmount < expectedAmount - 0.01;

        if (existing) {
            await prisma.rentPayment.update({
                where: { id: existing.id },
                data: {
                    status: isPartial ? "PARTIAL" : "PAID",
                    paidAt: new Date(),
                    paidAmount: isPartial ? paidAmount : null,
                }
            });
        } else {
            await prisma.rentPayment.create({
                data: {
                    leaseId,
                    period,
                    amount: expectedAmount,
                    status: isPartial ? "PARTIAL" : "PAID",
                    paidAt: new Date(),
                    paidAmount: isPartial ? paidAmount : null,
                }
            });
        }

        // Fetch the created/updated payment to send to n8n
        const paymentData = await prisma.rentPayment.findFirst({
            where: { leaseId, period },
            include: { lease: { include: { tenant: true, apartment: true } } }
        });

        if (paymentData) {
            await notifyN8n('RENT_PAID', paymentData);
        }
    } catch (error) {
        console.error("Erreur lors du marquage du paiement:", error);
        throw new Error("Impossible de marquer le loyer comme payé.");
    }

    revalidatePath("/rents");
    revalidatePath("/");
}

export async function cancelRentPayment(paymentId: string) {
    if (!paymentId) throw new Error("ID de paiement manquant.");
    await prisma.rentPayment.update({
        where: { id: paymentId },
        data: { status: "PENDING", paidAt: null }
    });
    revalidatePath("/rents");
    revalidatePath("/");
}

export async function sendRentReminder(leaseId: string, periodStr: string) {
    if (!leaseId || !periodStr) {
        throw new Error("Données de relance invalides.");
    }

    const period = new Date(periodStr);

    try {
        const existing = await prisma.rentPayment.findFirst({
            where: { leaseId, period }
        });

        if (existing) {
            await prisma.rentPayment.update({
                where: { id: existing.id },
                data: { sentAt: new Date() }
            });
        } else {
            const lease = await prisma.lease.findUnique({ where: { id: leaseId } });
            if (!lease) {
                throw new Error("Bail introuvable.");
            }

            await prisma.rentPayment.create({
                data: {
                    leaseId,
                    period,
                    amount: lease.rentAmount + lease.chargesAmount,
                    status: "PENDING",
                    sentAt: new Date(),
                }
            });
        }
    } catch (error) {
        console.error("Erreur lors de l'envoi de la relance:", error);
        throw new Error("Impossible d'envoyer la relance.");
    }

    revalidatePath("/rents");
    revalidatePath("/");
}
