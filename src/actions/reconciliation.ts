"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Fetches pending/late rents to match against incoming bank credits
export async function getExpectedRents() {
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
    try {
        const payment = await prisma.rentPayment.findUnique({
            where: { id: rentPaymentId },
            include: { lease: true }
        });

        if (!payment) {
            return { success: false, error: "Paiement introuvable" };
        }

        // Optional: you could do partial payments, but for now we mark as PAID
        await prisma.rentPayment.update({
            where: { id: rentPaymentId },
            data: {
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
