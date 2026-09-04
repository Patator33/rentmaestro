'use server'

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAction } from "@/lib/audit";
import { expectedRentForPeriod } from "@/lib/rent-period";
import { requireAuth } from "@/lib/session";

function parsePeriod(periodStr: string): Date {
    const [y, m] = periodStr.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, 1));
}

/** Baux éligibles CAF pour un mois donné, avec ce qui a déjà été reçu de la CAF ce mois-là. */
export async function getCafEligibleLeases(periodStr: string) {
    await requireAuth();
    const period = parsePeriod(periodStr);
    const nextMonth = new Date(Date.UTC(period.getUTCFullYear(), period.getUTCMonth() + 1, 1));

    const leases = await prisma.lease.findMany({
        where: {
            cafMonthlyAmount: { not: null },
            startDate: { lt: nextMonth },
            OR: [{ endDate: null }, { endDate: { gte: period } }],
        },
        include: {
            apartment: true,
            tenant: true,
            payments: { where: { period } },
        },
        orderBy: [{ apartment: { name: 'asc' } }],
    });

    return leases.map(l => {
        const payment = l.payments[0] ?? null;
        const expected = expectedRentForPeriod(l, period);
        return {
            leaseId: l.id,
            apartmentLabel: l.apartment.name || l.apartment.address,
            tenantLabel: `${l.tenant.firstName} ${l.tenant.lastName}`,
            cafMonthlyAmount: l.cafMonthlyAmount as number,
            expected,
            alreadyReceivedCaf: payment?.cafAmount ?? 0,
            status: payment?.status ?? 'PENDING',
        };
    });
}

/**
 * Enregistre un virement CAF unique couvrant plusieurs baux (cas courant : la
 * CAF verse un seul virement groupé pour tous les locataires bénéficiaires).
 * Chaque part vient s'ajouter au cumul déjà payé sur le loyer du mois, comme
 * un paiement locataire, mais est tracée séparément dans cafAmount pour
 * pouvoir distinguer part CAF / part locataire dans le détail.
 */
export async function recordCafBatch(
    reference: string,
    dateStr: string,
    periodStr: string,
    entries: { leaseId: string; amount: number }[]
) {
    await requireAuth();
    const validEntries = entries.filter(e => !isNaN(e.amount) && e.amount > 0);
    if (!reference.trim() || !dateStr || validEntries.length === 0) {
        throw new Error("Données de virement CAF invalides.");
    }

    const period = parsePeriod(periodStr);
    const paidAt = new Date(dateStr);

    for (const entry of validEntries) {
        const lease = await prisma.lease.findUnique({ where: { id: entry.leaseId } });
        if (!lease) continue;

        const existing = await prisma.rentPayment.findFirst({ where: { leaseId: entry.leaseId, period } });
        const expectedAmount = expectedRentForPeriod(lease, period);

        const priorTotal = (existing?.status === 'PARTIAL' && existing?.paidAmount != null) ? (existing.paidAmount as number) : 0;
        const priorCaf = existing?.cafAmount ?? 0;
        const totalPaid = priorTotal + entry.amount;
        const totalCaf = priorCaf + entry.amount;
        const isPartial = totalPaid < expectedAmount - 0.01;

        const data = {
            amount: expectedAmount,
            status: isPartial ? "PARTIAL" : "PAID",
            paidAt,
            paidAmount: isPartial ? totalPaid : null,
            cafAmount: totalCaf,
            cafReference: reference.trim(),
        };

        if (existing) {
            await prisma.rentPayment.update({ where: { id: existing.id }, data });
        } else {
            await prisma.rentPayment.create({ data: { leaseId: entry.leaseId, period, ...data } });
        }
    }

    await logAction({
        action: 'RECORD_CAF_BATCH',
        entity: 'RentPayment',
        entityId: reference.trim(),
        details: `${validEntries.length} bail(x) — ${validEntries.reduce((s, e) => s + e.amount, 0)}€ — ${period.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`,
    });

    revalidatePath("/caf");
    revalidatePath("/rents");
    revalidatePath("/");
}

/** Modifie le montant CAF/APL mensuel attendu pour un bail (0 ou vide = désactive). */
export async function updateCafMonthlyAmount(leaseId: string, amount: number | null) {
    await requireAuth();
    const clean = amount != null && !isNaN(amount) && amount > 0 ? amount : null;
    await prisma.lease.update({
        where: { id: leaseId },
        data: { cafMonthlyAmount: clean },
    });
    await logAction({
        action: 'UPDATE_CAF_MONTHLY_AMOUNT',
        entity: 'Lease',
        entityId: leaseId,
        details: clean ? `${clean}€/mois` : 'CAF désactivée',
    });
    revalidatePath('/caf');
    revalidatePath('/leases');
    revalidatePath(`/leases/${leaseId}`);
}

/** Historique des versements CAF reçus pour un bail donné. */
export async function getCafHistoryForLease(leaseId: string) {
    await requireAuth();
    const payments = await prisma.rentPayment.findMany({
        where: { leaseId, cafAmount: { not: null } },
        orderBy: { period: 'desc' },
    });
    return payments.map(p => ({
        period: p.period,
        cafAmount: p.cafAmount as number,
        cafReference: p.cafReference,
        paidAt: p.paidAt,
        status: p.status,
    }));
}
