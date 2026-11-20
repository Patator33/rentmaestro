'use server'

import { requireAuth } from '@/lib/session'
import { buildLeaseDocumentData, type LeaseDocumentData } from '@/lib/lease-document'
import { CATALOG_BY_KEY } from '@/lib/lease-catalog'

export type LeaseDocumentPreview = Omit<LeaseDocumentData, 'values'> & {
    /** Valeurs lisibles : libellé du champ du catalogue, nom DocuSeal et valeur. */
    values: { key: string; label: string; kind: 'text' | 'checkbox'; value: string | boolean }[]
}

/**
 * Contrôle et aperçu des données qui seront envoyées à DocuSeal pour ce bail :
 * ce qui manque (avec le lien pour le saisir), les signataires, les valeurs.
 * Ne contacte pas DocuSeal et n'enregistre rien.
 */
export async function previewLeaseDocument(leaseId: string): Promise<LeaseDocumentPreview | null> {
    await requireAuth()
    const data = await buildLeaseDocumentData(leaseId)
    if (!data) return null
    const values = Object.entries(data.values).map(([key, value]) => {
        const field = CATALOG_BY_KEY.get(key)
        return { key, label: field?.label ?? key, kind: field?.kind ?? 'text', value }
    })
    return { ...data, values }
}
