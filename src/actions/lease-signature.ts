'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/session'
import {
    SignatureError, sendLeaseForSignature, cancelLeaseSignature, getLeaseSignatureStatus,
    type SendResult, type RequestStatus,
} from '@/lib/signature'
import { DocusealError } from '@/lib/docuseal'

export type SignatureActionResult =
    | { success: true; warnings: string[]; result?: SendResult }
    | { success: false; error: string; details?: string[] }

function failure(e: unknown): SignatureActionResult {
    if (e instanceof SignatureError) return { success: false, error: e.message, details: e.details }
    if (e instanceof DocusealError) return { success: false, error: e.message }
    console.error('Erreur signature de bail :', e)
    return { success: false, error: "Erreur inattendue lors de l'envoi en signature." }
}

/** Envoie le bail (et l'acte de cautionnement s'il y a un garant privé) en signature. */
export async function sendLeaseSignature(leaseId: string, regenerate = false, notify = true): Promise<SignatureActionResult> {
    await requireAuth()
    try {
        const result = await sendLeaseForSignature(leaseId, { regenerate, notify })
        revalidatePath(`/leases/${leaseId}`)
        revalidatePath('/leases')
        return { success: true, warnings: result.warnings, result }
    } catch (e) {
        return failure(e)
    }
}

/** Annule les demandes de signature en cours. */
export async function cancelLeaseSignatureAction(leaseId: string): Promise<SignatureActionResult> {
    await requireAuth()
    try {
        await cancelLeaseSignature(leaseId)
        revalidatePath(`/leases/${leaseId}`)
        revalidatePath('/leases')
        return { success: true, warnings: [] }
    } catch (e) {
        return failure(e)
    }
}

export async function getLeaseSignatureRequests(leaseId: string): Promise<RequestStatus[]> {
    await requireAuth()
    return getLeaseSignatureStatus(leaseId)
}
