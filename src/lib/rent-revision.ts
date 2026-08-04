import { prisma } from '@/lib/prisma';
import { logAction } from '@/lib/audit';

export interface RevisionParams {
    newRent: number;
    baseQuarter: string;
    baseIndex: number;
    newQuarter: string;
    newIndex: number;
    effectiveDate?: string | null;
}

/**
 * Applique une révision IRL : nouveau loyer, nouvelle base d'indice, date
 * d'effet, et propagation du montant aux loyers futurs non encore réglés.
 *
 * Partagé entre l'action « Appliquer la révision » et l'envoi du courrier au
 * locataire, qui doit acter la révision au moment où le locataire en est informé.
 */
export async function applyRentRevisionCore(leaseId: string, params: RevisionParams) {
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

        return { success: true };
    } catch (error) {
        console.error('Erreur lors de la révision du loyer:', error);
        return { success: false, error: "Impossible d'appliquer la révision." };
    }
}
