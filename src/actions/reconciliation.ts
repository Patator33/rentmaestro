"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/session";
import { expectedRentForPeriod } from "@/lib/rent-period";

// Fetches pending/late rents to match against incoming bank credits
export async function getExpectedRents() {
    await requireAuth();
    try {
        const rents = await prisma.rentPayment.findMany({
            where: {
                status: { in: ["PENDING", "LATE"] }
            },
            include: {
                lease: {
                    include: {
                        apartment: true,
                        tenant: true,
                    }
                }
            },
            orderBy: { period: "asc" }
        });
        return { success: true, data: rents };
    } catch (error: any) {
        console.error("Erreur getExpectedRents:", error);
        return { success: false, error: "Erreur lors de la récupération des loyers." };
    }
}

export async function matchRentPayment(rentPaymentId: string, paidDateStr: string, amountPaid: number) {
    await requireAuth();
    try {
        const payment = await prisma.rentPayment.findUnique({
            where: { id: rentPaymentId },
            include: { lease: true }
        });

        if (!payment) {
            return { success: false, error: "Paiement introuvable" };
        }

        // Recalculé depuis le bail plutôt que réutilisé depuis la ligne
        // existante : une ligne générée avant l'enregistrement d'un départ
        // restait figée au loyer plein, le prorata de sortie n'était jamais repris.
        const expectedAmount = expectedRentForPeriod(payment.lease, payment.period);

        // Optional: you could do partial payments, but for now we mark as PAID
        await prisma.rentPayment.update({
            where: { id: rentPaymentId },
            data: {
                amount: expectedAmount,
                status: "PAID",
                paidAt: new Date(paidDateStr)
            }
        });

        revalidatePath("/rents");
        revalidatePath("/reconciliation");
        return { success: true };
    } catch (error: any) {
        console.error("Erreur matchRentPayment:", error);
        return { success: false, error: "Impossible de valider le loyer." };
    }
}

export async function createDirectExpense(apartmentId: string, category: string, description: string, amount: number, dateStr: string) {
    await requireAuth();
    try {
        await prisma.expense.create({
            data: {
                apartmentId,
                category,
                description,
                amount: Math.abs(amount), // Ensure expense is positive in DB
                date: new Date(dateStr)
            }
        });

        revalidatePath("/apartments");
        revalidatePath("/stats");
        revalidatePath("/reconciliation");
        return { success: true };
    } catch (error: any) {
        console.error("Erreur createDirectExpense:", error);
        return { success: false, error: "Impossible de créer la dépense." };
    }
}
