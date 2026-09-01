'use server'

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/session";

export async function updateDepositStatus(leaseId: string, status: string) {
    await requireAuth();
    // RETURNED / DEDUCTED passent par `returnDeposit` (montant restitué + annotation + email).
    const validStatuses = ['PENDING', 'PARTIAL_RECEIVED', 'RECEIVED', 'TO_RETURN'];
    if (!validStatuses.includes(status)) {
        throw new Error('Statut de dépôt invalide (la restitution se fait via « Restituer la caution »).');
    }

    try {
        await prisma.lease.update({
            where: { id: leaseId },
            data: {
                depositStatus: status,
                depositReturnedAt: null,
            }
        });
    } catch (error) {
        console.error('Erreur mise à jour dépôt:', error);
        throw new Error('Impossible de mettre à jour le statut du dépôt.');
    }

    revalidatePath('/leases');
    revalidatePath('/');
}

export async function addExpense(formData: FormData) {
    await requireAuth();
    const apartmentId = formData.get('apartmentId') as string;
    const category = formData.get('category') as string;
    const description = formData.get('description') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const dateStr = formData.get('date') as string;
    const recurring = formData.get('recurring') === 'true';

    if (!apartmentId || !category || !description || isNaN(amount) || !dateStr) {
        throw new Error('Données de dépense invalides.');
    }

    try {
        await prisma.expense.create({
            data: {
                apartmentId,
                category,
                description,
                amount,
                date: new Date(dateStr),
                recurring,
            }
        });
    } catch (error) {
        console.error('Erreur ajout dépense:', error);
        throw new Error('Impossible d\'ajouter la dépense.');
    }

    revalidatePath(`/apartments/${apartmentId}`);
    revalidatePath('/stats');
}

export async function deleteExpense(id: string) {
    await requireAuth();
    try {
        const expense = await prisma.expense.findUnique({ where: { id } });
        if (!expense) throw new Error('Dépense introuvable.');

        await prisma.expense.delete({ where: { id } });
        revalidatePath(`/apartments/${expense.apartmentId}`);
        revalidatePath('/stats');
    } catch (error) {
        console.error('Erreur suppression dépense:', error);
        throw new Error('Impossible de supprimer la dépense.');
    }
}

export async function addTenantNote(formData: FormData) {
    await requireAuth();
    const tenantId = formData.get('tenantId') as string;
    const content = formData.get('content') as string;
    const type = formData.get('type') as string || 'NOTE';

    if (!tenantId || !content) {
        throw new Error('Contenu de la note requis.');
    }

    try {
        await prisma.tenantNote.create({
            data: { tenantId, content, type }
        });
    } catch (error) {
        console.error('Erreur ajout note:', error);
        throw new Error('Impossible d\'ajouter la note.');
    }

    revalidatePath(`/tenants/${tenantId}`);
}

export async function deleteTenantNote(id: string) {
    await requireAuth();
    try {
        const note = await prisma.tenantNote.findUnique({ where: { id } });
        if (!note) throw new Error('Note introuvable.');

        await prisma.tenantNote.delete({ where: { id } });
        revalidatePath(`/tenants/${note.tenantId}`);
    } catch (error) {
        console.error('Erreur suppression note:', error);
        throw new Error('Impossible de supprimer la note.');
    }
}
