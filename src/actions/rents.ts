'use server'

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { notifyN8n } from "@/lib/n8n";
import { logAction } from "@/lib/audit";
import { calculateFutureProrata } from "@/lib/utils";

export async function markRentAsPaid(leaseId: string, periodStr: string, paidAmount: number) {
    if (!leaseId || !periodStr || isNaN(paidAmount) || paidAmount <= 0) {
        throw new Error("Données de paiement invalides.");
    }

    const period = new Date(periodStr);

    try {
        const existing = await prisma.rentPayment.findFirst({
            where: { leaseId, period }
        });

        // Determine expected amount (prorated for first month if tenant starts mid-month)
        let expectedAmount: number;
        if (existing) {
            expectedAmount = existing.amount;
        } else {
            const lease = await prisma.lease.findUnique({ where: { id: leaseId } });
            if (!lease) throw new Error("Bail introuvable.");
            const totalAmount = lease.rentAmount + lease.chargesAmount;
            const leaseStart = new Date(lease.startDate);
            const periodStart = new Date(Date.UTC(period.getFullYear(), period.getMonth(), 1));
            const periodEnd = new Date(Date.UTC(period.getFullYear(), period.getMonth() + 1, 1));
            const isFirstMonth = leaseStart >= periodStart && leaseStart < periodEnd;
            const prorata = isFirstMonth ? calculateFutureProrata(totalAmount, leaseStart) : null;
            expectedAmount = prorata ? Math.round(prorata.amount * 100) / 100 : totalAmount;
        }

        // Accumulate with any prior partial payment
        const alreadyPaid = (existing?.status === 'PARTIAL' && existing?.paidAmount != null)
            ? (existing.paidAmount as number) : 0;
        const totalPaid = alreadyPaid + paidAmount;
        const isPartial = totalPaid < expectedAmount - 0.01;

        if (existing) {
            await prisma.rentPayment.update({
                where: { id: existing.id },
                data: {
                    status: isPartial ? "PARTIAL" : "PAID",
                    paidAt: new Date(),
                    paidAmount: isPartial ? totalPaid : null,
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
                    paidAmount: isPartial ? totalPaid : null,
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
        const status = isPartial ? 'PARTIAL' : 'PAID';
        await logAction({ action: 'MARK_RENT_PAID', entity: 'RentPayment', entityId: leaseId, details: `${totalPaid}€ — ${status} — ${period.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}` });
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
    await logAction({ action: 'CANCEL_RENT_PAYMENT', entity: 'RentPayment', entityId: paymentId });
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

            const totalAmount = lease.rentAmount + lease.chargesAmount;
            const leaseStart = new Date(lease.startDate);
            const periodStart = new Date(Date.UTC(period.getFullYear(), period.getMonth(), 1));
            const periodEnd = new Date(Date.UTC(period.getFullYear(), period.getMonth() + 1, 1));
            const isFirstMonth = leaseStart >= periodStart && leaseStart < periodEnd;
            const prorata = isFirstMonth ? calculateFutureProrata(totalAmount, leaseStart) : null;
            const amount = prorata ? Math.round(prorata.amount * 100) / 100 : totalAmount;

            await prisma.rentPayment.create({
                data: {
                    leaseId,
                    period,
                    amount,
                    status: "PENDING",
                    sentAt: new Date(),
                }
            });
        }
        await logAction({ action: 'SEND_RENT_REMINDER', entity: 'Lease', entityId: leaseId, details: period.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) });

        const leaseForNote = await prisma.lease.findUnique({ where: { id: leaseId }, select: { tenantId: true } });
        if (leaseForNote) {
            await prisma.tenantNote.create({
                data: {
                    tenantId: leaseForNote.tenantId,
                    content: `Relance loyer envoyée — ${period.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`,
                    type: 'REMINDER',
                },
            });
        }
    } catch (error) {
        console.error("Erreur lors de l'envoi de la relance:", error);
        throw new Error("Impossible d'envoyer la relance.");
    }

    revalidatePath("/rents");
    revalidatePath("/");
}
