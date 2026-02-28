'use server'

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createLease(formData: FormData) {
    const apartmentId = formData.get("apartmentId") as string;
    const tenantId = formData.get("tenantId") as string;
    const startDateStr = formData.get("startDate") as string;
    const startDate = new Date(startDateStr);
    const rentAmount = parseFloat(formData.get("rentAmount") as string);
    const chargesAmount = parseFloat(formData.get("chargesAmount") as string);
    const depositAmountStr = formData.get("depositAmount") as string;
    const depositAmount = depositAmountStr ? parseFloat(depositAmountStr) : null;
    const terminateLeaseId = formData.get("terminateLeaseId") as string;

    if (!apartmentId || !tenantId || !startDateStr || isNaN(rentAmount) || isNaN(chargesAmount)) {
        throw new Error("Données invalides. Veuillez vérifier le formulaire.");
    }

    try {
        if (terminateLeaseId) {
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() - 1);

            await prisma.lease.update({
                where: { id: terminateLeaseId },
                data: {
                    isActive: false,
                    endDate: endDate
                }
            });
        }

        await prisma.lease.create({
            data: {
                apartmentId,
                tenantId,
                startDate,
                rentAmount,
                chargesAmount,
                depositAmount: depositAmount && !isNaN(depositAmount) ? depositAmount : null,
                depositStatus: depositAmount && !isNaN(depositAmount) ? 'PENDING' : null,
                isActive: true,
            },
        });
    } catch (error) {
        console.error("Erreur lors de la création du bail:", error);
        throw new Error("Impossible de créer le contrat. Veuillez réessayer.");
    }

    revalidatePath("/leases");
    revalidatePath("/apartments");
    redirect("/leases");
}

export async function terminateLease(id: string, endDateStr?: string | null) {
    let endDate: Date | null = new Date();

    if (endDateStr === null) {
        endDate = null;
    } else if (endDateStr) {
        endDate = new Date(endDateStr);
    }

    try {
        await prisma.lease.update({
            where: { id },
            data: {
                isActive: true,
                endDate: endDate,
            },
        });
    } catch (error) {
        console.error("Erreur lors de la terminaison du bail:", error);
        throw new Error("Impossible de modifier le contrat.");
    }

    revalidatePath("/apartments");
    revalidatePath("/leases");
}

export async function deleteLease(id: string) {
    try {
        await prisma.lease.delete({
            where: { id },
        });
    } catch (error) {
        console.error("Erreur lors de la suppression du bail:", error);
        throw new Error("Impossible de supprimer le contrat.");
    }
    revalidatePath("/leases");
    revalidatePath("/apartments");
}

export async function markRentReviewAsSent(leaseId: string) {
    try {
        await prisma.lease.update({
            where: { id: leaseId },
            data: { lastRentReviewDate: new Date() }
        });
    } catch (error) {
        console.error("Erreur lors du marquage de la révision:", error);
        throw new Error("Impossible de marquer la révision comme envoyée.");
    }
    revalidatePath("/");
}
