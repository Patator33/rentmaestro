/**
 * Client de l'API REST DocuSeal (en-tête `X-Auth-Token`). La configuration
 * vient de la table Setting (voir « Signature des baux » dans les paramètres).
 * Sans contrôle d'accès : l'appelant s'authentifie.
 */
import { prisma } from '@/lib/prisma'
import { DOCUSEAL_SETTING_KEYS as K } from '@/lib/lease-options'
import { CATALOG_BY_KEY, SIGNER_ROLES, catalogFor, type DocKind } from '@/lib/lease-catalog'
import type { LeaseType } from '@/lib/lease-options'

export class DocusealError extends Error {
    constructor(message: string, readonly status?: number) {
        super(message)
        this.name = 'DocusealError'
    }
}

export interface DocusealConfig {
    baseUrl: string
    apiKey: string
}

export async function getDocusealConfig(): Promise<DocusealConfig | null> {
    const rows = await prisma.setting.findMany({ where: { key: { in: [K.url, K.apiKey] } } })
    const map = new Map(rows.map(r => [r.key, r.value]))
    const baseUrl = (map.get(K.url) ?? '').trim()
    const apiKey = (map.get(K.apiKey) ?? '').trim()
    return baseUrl && apiKey ? { baseUrl, apiKey } : null
}

/** Appel JSON. Les redirections ne sont jamais suivies : la clé ne doit pas changer d'hôte. */
export async function docusealRequest<T>(cfg: DocusealConfig, path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
    let res: Response
    try {
        res = await fetch(`${cfg.baseUrl}${path}`, {
            method: init.method ?? 'GET',
            headers: {
                'X-Auth-Token': cfg.apiKey,
                Accept: 'application/json',
                ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            },
            body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
            signal: AbortSignal.timeout(20_000),
            cache: 'no-store',
            redirect: 'manual',
        })
    } catch {
        throw new DocusealError("DocuSeal injoignable depuis le serveur (URL, réseau ou délai dépassé).")
    }
    if (res.status >= 300 && res.status < 400) throw new DocusealError("DocuSeal a répondu par une redirection : vérifiez l'URL.", res.status)
    if (res.status === 401 || res.status === 403) throw new DocusealError('Clé API refusée par DocuSeal.', res.status)
    if (!res.ok) {
        let detail = ''
        try { detail = ((await res.json()) as { error?: string }).error ?? '' } catch { /* corps non JSON */ }
        throw new DocusealError(`DocuSeal a répondu ${res.status}${detail ? ` : ${detail}` : ''}.`, res.status)
    }
    return (await res.json()) as T
}

export interface TemplateField {
    name: string
    type: string
    /** Rôle propriétaire du champ (celui dont le signataire reçoit la valeur préremplie). */
    role: string | null
    required: boolean
}

export interface TemplateInfo {
    id: number
    name: string
    roles: string[]
    fields: TemplateField[]
}

interface RawTemplate {
    id: number
    name?: string
    submitters?: { name: string; uuid: string }[]
    fields?: { name?: string; type?: string; submitter_uuid?: string; required?: boolean }[]
}

export async function fetchTemplate(cfg: DocusealConfig, id: number): Promise<TemplateInfo> {
    const t = await docusealRequest<RawTemplate>(cfg, `/api/templates/${id}`)
    const roleByUuid = new Map((t.submitters ?? []).map(s => [s.uuid, s.name]))
    return {
        id: t.id,
        name: String(t.name ?? ''),
        roles: (t.submitters ?? []).map(s => s.name),
        fields: (t.fields ?? []).map(f => ({
            name: f.name ?? '',
            type: f.type ?? 'text',
            role: (f.submitter_uuid && roleByUuid.get(f.submitter_uuid)) || null,
            required: !!f.required,
        })),
    }
}

// ── Analyse d'un template par rapport au catalogue ───────────────────────────

/** Types de champs remplis par le signataire lui-même : jamais préremplis par RentMaestro. */
const SIGNER_FILLED_TYPES = new Set(['signature', 'initials', 'date', 'image', 'file', 'stamp', 'payment', 'phone', 'verification', 'cells'])
const OWN_PREFIXES: Record<string, string[]> = {
    [SIGNER_ROLES.COLOCATAIRE]: ['colocataire_'],
    [SIGNER_ROLES.CAUTION]: ['garant_', 'caution_'],
}

export interface TemplateAnalysis {
    id: number
    name: string
    roles: string[]
    /** Rôles obligatoires absents du template. */
    missingRoles: string[]
    /** Rôles hors de la liste standard (Bailleur, Locataire, Colocataire, Caution). */
    extraRoles: string[]
    /** Champs du template que RentMaestro préremplit. */
    matched: string[]
    /** Champs texte inconnus du catalogue : à remplir par le signataire. */
    freeFields: { name: string; type: string; role: string | null }[]
    /** Champs préremplis posés sur un rôle parfois absent : ils resteraient vides. */
    riskyRoleFields: { name: string; role: string }[]
    /** Noms présents plusieurs fois avec des rôles différents. */
    ambiguousNames: string[]
    /** Champs du catalogue applicables à ce document, absents du template (information). */
    notInTemplate: string[]
}

export function analyzeTemplate(info: TemplateInfo, doc: DocKind, type: LeaseType | null): TemplateAnalysis {
    const standard = Object.values(SIGNER_ROLES) as string[]
    const requiredRoles: string[] = doc === 'BAIL' ? [SIGNER_ROLES.BAILLEUR, SIGNER_ROLES.LOCATAIRE] : [SIGNER_ROLES.CAUTION]
    const catalog = new Set(catalogFor(doc, type).map(f => f.key))

    const matched = new Set<string>()
    const freeFields: TemplateAnalysis['freeFields'] = []
    const riskyRoleFields: TemplateAnalysis['riskyRoleFields'] = []
    const rolesByName = new Map<string, Set<string>>()

    for (const f of info.fields) {
        if (!f.name) continue
        const set = rolesByName.get(f.name) ?? new Set<string>()
        set.add(f.role ?? '')
        rolesByName.set(f.name, set)

        if (CATALOG_BY_KEY.has(f.name)) {
            matched.add(f.name)
            const optional = f.role === SIGNER_ROLES.COLOCATAIRE || f.role === SIGNER_ROLES.CAUTION
            if (optional && f.role && !OWN_PREFIXES[f.role]?.some(p => f.name.startsWith(p))) {
                riskyRoleFields.push({ name: f.name, role: f.role })
            }
        } else if (!SIGNER_FILLED_TYPES.has(f.type)) {
            freeFields.push({ name: f.name, type: f.type, role: f.role })
        }
    }

    return {
        id: info.id,
        name: info.name,
        roles: info.roles,
        missingRoles: requiredRoles.filter(r => !info.roles.includes(r)),
        extraRoles: info.roles.filter(r => !standard.includes(r)),
        matched: [...matched].sort(),
        freeFields,
        riskyRoleFields,
        ambiguousNames: [...rolesByName].filter(([, roles]) => roles.size > 1).map(([n]) => n),
        notInTemplate: [...catalog].filter(k => !matched.has(k)),
    }
}
