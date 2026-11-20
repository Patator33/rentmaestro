'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/session'
import {
    DOCUSEAL_SETTING_KEYS as K,
    DEFAULT_SIGNATURE_REMINDER_DAYS,
    DEFAULT_SIGNATURE_REMINDER_MAX,
} from '@/lib/lease-options'

export type DocusealSettingsView = {
    url: string
    apiKeyConfigured: boolean
    apiKeyHint: string
    webhookSecretConfigured: boolean
    webhookSecretHint: string
    tplNu: string
    tplMeuble: string
    tplColoc: string
    tplCaution: string
    reminderDays: number
    reminderMax: number
}

export type DocusealSettingsInput = {
    url: string
    /** Vide = on conserve la clé déjà enregistrée. */
    apiKey: string
    /** Vide = on conserve le secret déjà enregistré. */
    webhookSecret: string
    tplNu: string
    tplMeuble: string
    tplColoc: string
    tplCaution: string
    reminderDays: string
    reminderMax: string
}

const hint = (v: string | undefined | null) => (v ? `…${v.slice(-4)}` : '')

async function readAll(): Promise<Map<string, string>> {
    const rows = await prisma.setting.findMany({ where: { key: { in: Object.values(K) } } })
    return new Map(rows.map(r => [r.key, r.value]))
}

/** Lecture des réglages pour le formulaire : les secrets ne sont jamais renvoyés. */
export async function getDocusealSettings(): Promise<DocusealSettingsView> {
    await requireAuth()
    const s = await readAll()
    const days = parseInt(s.get(K.reminderDays) ?? '', 10)
    const max = parseInt(s.get(K.reminderMax) ?? '', 10)
    return {
        url: s.get(K.url) ?? '',
        apiKeyConfigured: !!s.get(K.apiKey),
        apiKeyHint: hint(s.get(K.apiKey)),
        webhookSecretConfigured: !!s.get(K.webhookSecret),
        webhookSecretHint: hint(s.get(K.webhookSecret)),
        tplNu: s.get(K.tplNu) ?? '',
        tplMeuble: s.get(K.tplMeuble) ?? '',
        tplColoc: s.get(K.tplColoc) ?? '',
        tplCaution: s.get(K.tplCaution) ?? '',
        reminderDays: Number.isFinite(days) && days > 0 ? days : DEFAULT_SIGNATURE_REMINDER_DAYS,
        reminderMax: Number.isFinite(max) && max >= 0 ? max : DEFAULT_SIGNATURE_REMINDER_MAX,
    }
}

/** Accepte uniquement une origine http(s) sans identifiants ; retire le « / » final. */
function normalizeBaseUrl(raw: string): string | null {
    const t = raw.trim()
    if (!t) return ''
    let u: URL
    try { u = new URL(t) } catch { return null }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    if (u.username || u.password) return null
    return `${u.protocol}//${u.host}${u.pathname.replace(/\/+$/, '')}`
}

function templateId(raw: string): string | null {
    const t = raw.trim()
    if (!t) return ''
    return /^\d{1,9}$/.test(t) ? String(parseInt(t, 10)) : null
}

async function put(key: string, value: string) {
    await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } })
}

export async function saveDocusealSettings(input: DocusealSettingsInput): Promise<{ success: boolean; error?: string; apiKeyHint?: string; webhookSecretHint?: string }> {
    await requireAuth()

    const url = normalizeBaseUrl(input.url)
    if (url === null) return { success: false, error: "URL DocuSeal invalide (ex. https://sign.exemple.fr)." }

    const ids: Record<string, string | null> = {
        [K.tplNu]: templateId(input.tplNu),
        [K.tplMeuble]: templateId(input.tplMeuble),
        [K.tplColoc]: templateId(input.tplColoc),
        [K.tplCaution]: templateId(input.tplCaution),
    }
    const idLabels: Record<string, string> = {
        [K.tplNu]: 'bail nu',
        [K.tplMeuble]: 'bail meublé',
        [K.tplColoc]: 'colocation',
        [K.tplCaution]: 'acte de cautionnement',
    }
    for (const [key, v] of Object.entries(ids)) {
        if (v === null) return { success: false, error: `Numéro de template invalide (${idLabels[key]}) : un nombre entier est attendu.` }
    }

    const days = parseInt(input.reminderDays, 10)
    const max = parseInt(input.reminderMax, 10)
    if (!Number.isFinite(days) || days < 1 || days > 60) return { success: false, error: 'Délai de rappel : entre 1 et 60 jours.' }
    if (!Number.isFinite(max) || max < 0 || max > 10) return { success: false, error: 'Nombre de rappels : entre 0 et 10.' }

    await put(K.url, url)
    for (const [key, v] of Object.entries(ids)) await put(key, v ?? '')
    await put(K.reminderDays, String(days))
    await put(K.reminderMax, String(max))

    const apiKey = input.apiKey.trim()
    const secret = input.webhookSecret.trim()
    if (apiKey) await put(K.apiKey, apiKey)
    if (secret) await put(K.webhookSecret, secret)

    revalidatePath('/gestion/parametres')
    const s = await readAll()
    return { success: true, apiKeyHint: hint(s.get(K.apiKey)), webhookSecretHint: hint(s.get(K.webhookSecret)) }
}

/**
 * Teste l'URL et la clé saisies (ou enregistrées) en lisant les templates
 * configurés. Les valeurs du formulaire priment, sans être enregistrées.
 */
export async function testDocusealConnection(input: {
    url: string; apiKey: string; tplNu: string; tplMeuble: string; tplColoc: string; tplCaution: string
}): Promise<{ success: boolean; error?: string; templates?: { label: string; id: number; name: string; roles: string[] }[] }> {
    await requireAuth()
    const s = await readAll()
    const base = normalizeBaseUrl(input.url) || s.get(K.url) || ''
    const apiKey = input.apiKey.trim() || s.get(K.apiKey) || ''
    if (!base) return { success: false, error: "URL DocuSeal manquante." }
    if (!apiKey) return { success: false, error: "Clé API manquante." }

    const wanted: [string, string][] = [
        ['Bail nu', input.tplNu.trim() || s.get(K.tplNu) || ''],
        ['Bail meublé', input.tplMeuble.trim() || s.get(K.tplMeuble) || ''],
        ['Colocation', input.tplColoc.trim() || s.get(K.tplColoc) || ''],
        ['Acte de cautionnement', input.tplCaution.trim() || s.get(K.tplCaution) || ''],
    ]

    const headers = { 'X-Auth-Token': apiKey, Accept: 'application/json' }
    const call = async (path: string) => {
        const res = await fetch(`${base}${path}`, { headers, signal: AbortSignal.timeout(15_000), cache: 'no-store' })
        if (res.status === 401 || res.status === 403) throw new Error('Clé API refusée par DocuSeal.')
        if (!res.ok) throw new Error(`DocuSeal a répondu ${res.status}.`)
        return res.json()
    }

    try {
        await call('/api/templates?limit=1')
        const templates: { label: string; id: number; name: string; roles: string[] }[] = []
        for (const [label, raw] of wanted) {
            if (!/^\d+$/.test(raw)) continue
            const t = await call(`/api/templates/${raw}`)
            templates.push({
                label,
                id: t.id,
                name: String(t.name ?? ''),
                roles: Array.isArray(t.submitters) ? t.submitters.map((x: { name: string }) => x.name) : [],
            })
        }
        return { success: true, templates }
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        return { success: false, error: msg.includes('fetch failed') || msg.includes('aborted') ? "DocuSeal injoignable depuis le serveur (URL, réseau ou délai dépassé)." : msg }
    }
}
