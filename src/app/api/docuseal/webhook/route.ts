import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { handleDocusealEvent } from '@/lib/signature-sync'
import { DOCUSEAL_SETTING_KEYS } from '@/lib/lease-options'

export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 1_000_000

function safeEqual(a: string, b: string): boolean {
    const ha = crypto.createHash('sha256').update(a).digest()
    const hb = crypto.createHash('sha256').update(b).digest()
    return crypto.timingSafeEqual(ha, hb)
}

/**
 * Webhook DocuSeal. Protégé par le secret des paramètres, envoyé dans l'en-tête
 * `x-docuseal-secret` uniquement : un secret dans l'URL finirait dans les
 * journaux du reverse proxy. Le corps n'est qu'un déclencheur : l'état réel est
 * relu dans DocuSeal avec la clé API.
 */
export async function POST(request: Request) {
    const row = await prisma.setting.findUnique({ where: { key: DOCUSEAL_SETTING_KEYS.webhookSecret } })
    const secret = row?.value?.trim()
    if (!secret) return NextResponse.json({ error: 'Webhook non configuré.' }, { status: 503 })

    const provided = request.headers.get('x-docuseal-secret') ?? ''
    if (!provided || !safeEqual(provided, secret)) {
        return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
    }

    const declared = Number(request.headers.get('content-length') ?? 0)
    if (declared > MAX_BODY_BYTES) return NextResponse.json({ error: 'Corps trop volumineux.' }, { status: 413 })

    let body: unknown
    try {
        const text = await request.text()
        if (text.length > MAX_BODY_BYTES) return NextResponse.json({ error: 'Corps trop volumineux.' }, { status: 413 })
        body = JSON.parse(text)
    } catch {
        return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 })
    }

    const payload = body && typeof body === 'object' ? (body as { event_type?: unknown; data?: unknown }) : {}
    const eventType = typeof payload.event_type === 'string' ? payload.event_type : ''

    try {
        const result = await handleDocusealEvent(eventType, payload.data)
        return NextResponse.json({ ok: true, ...result })
    } catch (e) {
        // 500 : DocuSeal réessaie plus tard (DocuSeal injoignable, fichier non enregistré…).
        console.error('[docuseal webhook]', eventType, e instanceof Error ? e.message : e)
        return NextResponse.json({ error: 'Traitement impossible.' }, { status: 500 })
    }
}
