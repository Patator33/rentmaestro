'use server'

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/session";
import * as caf from "@/lib/caf";

// Server Actions web : authentification par session, logique dans @/lib/caf
// (partagée avec les routes /api/landlord/caf* de l'appli mobile).

/** Baux éligibles CAF pour un mois donné, avec ce qui a déjà été reçu de la CAF ce mois-là. */
export async function getCafEligibleLeases(periodStr: string) {
    await requireAuth();
    return caf.getCafEligibleLeases(periodStr);
}

/** Baux actifs sans CAF encore renseignée : candidats du bouton « Ajouter » de la page CAF. */
export async function getLeasesWithoutCaf() {
    await requireAuth();
    return caf.getLeasesWithoutCaf();
}

export async function recordCafBatch(
    reference: string,
    dateStr: string,
    periodStr: string,
    entries: { leaseId: string; amount: number }[]
) {
    await requireAuth();
    await caf.recordCafBatch(reference, dateStr, periodStr, entries);
    revalidatePath("/caf");
    revalidatePath("/rents");
    revalidatePath("/");
}

/** Modifie le montant CAF/APL mensuel attendu pour un bail (0 ou vide = désactive). */
export async function updateCafMonthlyAmount(leaseId: string, amount: number | null) {
    await requireAuth();
    await caf.updateCafMonthlyAmount(leaseId, amount);
    revalidatePath('/caf');
    revalidatePath('/leases');
    revalidatePath(`/leases/${leaseId}`);
}

/** Historique des versements CAF reçus pour un bail donné. */
export async function getCafHistoryForLease(leaseId: string) {
    await requireAuth();
    return caf.getCafHistoryForLease(leaseId);
}
