'use server'

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAction } from "@/lib/audit";
import { requireAuth } from "@/lib/session";

export async function createLease(formData: FormData) {
    await requireAuth();
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

    let newLeaseId: string;
    try {
        if (terminateLeaseId) {
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() - 1);
            await prisma.lease.update({
                where: { id: terminateLeaseId },
                data: { isActive: false, endDate },
            });
        }

        const guarantorType = (formData.get("guarantorType") as string) || 'NONE';
        const guarantorFirstName = (formData.get("guarantorFirstName") as string) || null;
        const guarantorLastName = (formData.get("guarantorLastName") as string) || null;
        const guarantorEmail = (formData.get("guarantorEmail") as string) || null;
        const guarantorPhone = (formData.get("guarantorPhone") as string) || null;

        const newLease = await prisma.lease.create({
            data: {
                apartmentId,
                tenantId,
                startDate,
                rentAmount,
                chargesAmount,
                depositAmount: depositAmount && !isNaN(depositAmount) ? depositAmount : null,
                depositStatus: depositAmount && !isNaN(depositAmount) ? 'PENDING' : null,
                isActive: true,
                guarantorType: guarantorType !== 'NONE' ? guarantorType : null,
                guarantorFirstName: guarantorType === 'PRIVATE' ? guarantorFirstName : null,
                guarantorLastName: guarantorType === 'PRIVATE' ? guarantorLastName : null,
                guarantorEmail: guarantorType === 'PRIVATE' ? guarantorEmail : null,
                guarantorPhone: guarantorType === 'PRIVATE' ? guarantorPhone : null,
            },
        });
        await logAction({ action: 'CREATE_LEASE', entity: 'Lease', entityId: newLease.id, details: `Loyer: ${rentAmount}€` });
        newLeaseId = newLease.id;
    } catch (error) {
        console.error("Erreur lors de la création du bail:", error);
        throw new Error("Impossible de créer le contrat. Veuillez réessayer.");
    }

    revalidatePath("/", "layout");
    redirect(`/leases/${newLeaseId}/welcome-email`);
}

export async function terminateLease(id: string, endDateStr?: string | null) {
    await requireAuth();
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
                isActive: false,
                endDate: endDate,
            },
        });
        await logAction({ action: 'TERMINATE_LEASE', entity: 'Lease', entityId: id, details: endDate ? `Fin: ${endDate.toLocaleDateString('fr-FR')}` : 'Sans date de fin' });
    } catch (error) {
        console.error("Erreur lors de la terminaison du bail:", error);
        throw new Error("Impossible de modifier le contrat.");
    }

    revalidatePath("/", "layout");
}

export async function deleteLease(id: string) {
    await requireAuth();
    try {
        await prisma.lease.delete({
            where: { id },
        });
        await logAction({ action: 'DELETE_LEASE', entity: 'Lease', entityId: id });
    } catch (error) {
        console.error("Erreur lors de la suppression du bail:", error);
        throw new Error("Impossible de supprimer le contrat.");
    }
    revalidatePath("/leases");
    revalidatePath("/apartments");
}

export async function updateLease(id: string, formData: FormData) {
    await requireAuth();
    const startDateStr = formData.get("startDate") as string;
    const endDateStr = formData.get("endDate") as string;
    const rentAmountStr = formData.get("rentAmount") as string;
    const chargesAmountStr = formData.get("chargesAmount") as string;
    const depositAmountStr = formData.get("depositAmount") as string;
    const rentEffectiveDateStr = formData.get("rentEffectiveDate") as string;

    if (!startDateStr) {
        throw new Error("La date de début est obligatoire.");
    }

    const startDate = new Date(startDateStr);
    const endDate = endDateStr ? new Date(endDateStr) : null;
    const rentAmount = parseFloat(rentAmountStr);
    const chargesAmount = parseFloat(chargesAmountStr);
    const depositAmount = depositAmountStr ? parseFloat(depositAmountStr) : null;
    // Force UTC 1st of month to match how periods are stored in generate-rents
    let effectiveDate: Date | null = null;
    if (rentEffectiveDateStr) {
        const [y, m] = rentEffectiveDateStr.split('-').map(Number);
        effectiveDate = new Date(Date.UTC(y, m - 1, 1));
    }

    if (isNaN(rentAmount) || isNaN(chargesAmount)) {
        throw new Error("Montants invalides.");
    }

    try {
        const guarantorType = (formData.get("guarantorType") as string) || 'NONE';
        const guarantorFirstName = (formData.get("guarantorFirstName") as string) || null;
        const guarantorLastName = (formData.get("guarantorLastName") as string) || null;
        const guarantorEmail = (formData.get("guarantorEmail") as string) || null;
        const guarantorPhone = (formData.get("guarantorPhone") as string) || null;

        await prisma.lease.update({
            where: { id },
            data: {
                startDate,
                endDate,
                rentAmount,
                chargesAmount,
                depositAmount: depositAmount !== null && !isNaN(depositAmount) ? depositAmount : null,
                ...(effectiveDate ? { lastRentReviewDate: effectiveDate } : {}),
                guarantorType: guarantorType !== 'NONE' ? guarantorType : null,
                guarantorFirstName: guarantorType === 'PRIVATE' ? guarantorFirstName : null,
                guarantorLastName: guarantorType === 'PRIVATE' ? guarantorLastName : null,
                guarantorEmail: guarantorType === 'PRIVATE' ? guarantorEmail : null,
                guarantorPhone: guarantorType === 'PRIVATE' ? guarantorPhone : null,
            }
        });

        if (effectiveDate) {
            await prisma.rentPayment.updateMany({
                where: {
                    leaseId: id,
                    period: { gte: effectiveDate },
                    status: { in: ['PENDING', 'LATE'] },
                },
                data: { amount: rentAmount + chargesAmount },
            });
        }
        await logAction({ action: 'UPDATE_LEASE', entity: 'Lease', entityId: id, details: `Loyer: ${rentAmount}€` });
    } catch (error) {
        console.error("Erreur lors de la modification du bail:", error);
        throw new Error("Impossible de modifier le contrat.");
    }

    revalidatePath("/", "layout");
    redirect("/leases");
}

export async function setDepositAmount(leaseId: string, amount: number) {
    await requireAuth();
    await prisma.lease.update({
        where: { id: leaseId },
        data: { depositAmount: amount, depositStatus: 'PENDING' },
    });
    revalidatePath('/leases');
    revalidatePath(`/leases/${leaseId}`);
}

export async function markDepositReceived(leaseId: string, amount: number) {
    await requireAuth();
    const lease = await prisma.lease.findUnique({ where: { id: leaseId } });
    const total = lease?.depositAmount ?? amount;
    const alreadyPaid = lease?.depositPaidAmount ?? 0;
    const totalPaid = alreadyPaid + amount;
    const isComplete = totalPaid >= total;
    await prisma.lease.update({
        where: { id: leaseId },
        data: {
            depositPaidAmount: isComplete ? null : totalPaid,
            depositStatus: isComplete ? 'RECEIVED' : 'PARTIAL_RECEIVED',
        },
    });
    revalidatePath('/leases');
    revalidatePath(`/leases/${leaseId}`);
}

export async function payDepositPartial(leaseId: string, paidAmount: number) {
    await requireAuth();
    const lease = await prisma.lease.findUnique({ where: { id: leaseId } });
    if (!lease) throw new Error('Bail introuvable');
    const total = lease.depositAmount ?? 0;
    const alreadyPaid = lease.depositPaidAmount ?? 0;
    const totalPaid = alreadyPaid + paidAmount;
    const isComplete = totalPaid >= total;
    await prisma.lease.update({
        where: { id: leaseId },
        data: {
            depositPaidAmount: isComplete ? null : totalPaid,
            depositStatus: isComplete ? 'RECEIVED' : 'PARTIAL_RECEIVED',
        },
    });
    revalidatePath('/leases');
    revalidatePath(`/leases/${leaseId}`);
}

export async function markDepositReturned(leaseId: string, amount: number) {
    await requireAuth();
    await prisma.lease.update({
        where: { id: leaseId },
        data: { depositStatus: 'RETURNED', depositReturnedAt: new Date() },
    });
    revalidatePath('/leases');
    revalidatePath(`/leases/${leaseId}`);
}

export async function setGuarantorVisaleOk(leaseId: string, ok: boolean) {
    await requireAuth();
    await prisma.lease.update({
        where: { id: leaseId },
        data: { guarantorVisaleOk: ok },
    });
    revalidatePath('/leases');
    revalidatePath(`/leases/${leaseId}`);
}

// Applies an IRL rent revision: updates the rent, records the new baseline
// index/quarter, and propagates the new amount to future unpaid rent payments.
export async function applyRentRevision(
    leaseId: string,
    params: {
        newRent: number;
        baseQuarter: string;
        baseIndex: number;
        newQuarter: string;
        newIndex: number;
        effectiveDate?: string | null;
    }
) {
    await requireAuth();
    const { newRent, baseQuarter, baseIndex, newQuarter, newIndex, effectiveDate } = params;
    if (isNaN(newRent) || newRent <= 0) {
        return { success: false, error: 'Nouveau loyer invalide.' };
    }
    try {
        const lease = await prisma.lease.findUnique({ where: { id: leaseId } });
        if (!lease) return { success: false, error: 'Bail introuvable.' };

        let effective: Date = new Date();
        if (effectiveDate) {
            const [y, m] = effectiveDate.split('-').map(Number);
            effective = new Date(Date.UTC(y, m - 1, 1));
        }

        await prisma.lease.update({
            where: { id: leaseId },
            data: {
                rentAmount: newRent,
                lastRentReviewDate: effective,
                irlBaseIndex: newIndex,
                irlBaseQuarter: newQuarter,
            } as any,
        });

        // Propagate to future unpaid rent payments
        await prisma.rentPayment.updateMany({
            where: {
                leaseId,
                period: { gte: effective },
                status: { in: ['PENDING', 'LATE'] },
            },
            data: { amount: newRent + lease.chargesAmount },
        });

        await logAction({
            action: 'RENT_REVISION',
            entity: 'Lease',
            entityId: leaseId,
            details: `IRL ${baseQuarter} (${baseIndex}) → ${newQuarter} (${newIndex}) — nouveau loyer ${newRent}€`,
        });
    } catch (error) {
        console.error('Erreur lors de la révision du loyer:', error);
        return { success: false, error: 'Impossible d\'appliquer la révision.' };
    }
    revalidatePath('/', 'layout');
    revalidatePath(`/leases/${leaseId}`);
    return { success: true };
}

export async function markRentReviewAsSent(leaseId: string) {
    await requireAuth();
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
