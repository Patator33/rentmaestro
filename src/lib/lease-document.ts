/**
 * Données d'un bail pour DocuSeal : valeurs des champs du catalogue, signataires
 * et contrôle de ce qui manque. Sans contrôle d'accès : l'appelant (Server
 * Action web ou route mobile) est responsable de l'authentification.
 */
import { prisma } from '@/lib/prisma'
import { CATALOG_BY_KEY, SIGNER_ROLES, type DocKind } from '@/lib/lease-catalog'
import {
    DEFAULT_DURATION_MONTHS, DOCUSEAL_SETTING_KEYS as K, LEASE_TYPES, parseEquipments, parseRentRulesOverride,
    NATIONALITY_DEFAULT, type LeaseType,
} from '@/lib/lease-options'
import {
    addMonthsMinusOneDay, amountToFrenchWords, durationLabel, formatDateFr, formatDateLongFr, formatDayMonthFr,
    formatEuros, formatNumberFr, irlQuarterLabel, previousQuarterOf,
} from '@/lib/french-format'
import { DEFAULT_IRL_INDICES, findIndex, type IrlIndex } from '@/lib/irl'

export type MissingArea = 'tenant' | 'apartment' | 'building' | 'company' | 'lease' | 'settings'

export interface MissingItem {
    label: string
    area: MissingArea
    /** Écran où renseigner la donnée. */
    href: string
}

export interface Signer {
    role: string
    name: string
    email: string
}

export interface LeaseDocumentData {
    leaseId: string
    leaseType: LeaseType | null
    /** true si un garant privé existe : un acte de cautionnement est à générer. */
    needsGuaranteeAct: boolean
    templates: { bail: number | null; caution: number | null }
    /** Valeur de chaque champ du catalogue (texte, ou booléen pour les cases). */
    values: Record<string, string | boolean>
    signers: { bail: Signer[]; caution: Signer[] }
    missing: MissingItem[]
    warnings: string[]
}

const TEMPLATE_KEY: Record<LeaseType, string> = {
    NU: K.tplNu,
    MEUBLE: K.tplMeuble,
    COLOCATION: K.tplColoc,
}

const TYPE_LABEL: Record<string, string> = Object.fromEntries(LEASE_TYPES.map(t => [t.value, t.label]))

function presentFlag(v: string | null | undefined): v is string {
    return typeof v === 'string' && v.trim() !== ''
}

/** Période de construction : bornes des cases des baux (1989 appartient à « 1989 à 2005 »). */
function constructionPeriod(year: number | null): string | null {
    if (year === null) return null
    if (year < 1949) return 'avant_1949'
    if (year <= 1974) return '1949_1974'
    if (year <= 1988) return '1975_1989'
    if (year <= 2005) return '1989_2005'
    return 'apres_2005'
}

function fullName(first: string, last: string): string {
    return `${first.trim()} ${last.trim().toUpperCase()}`.trim()
}

export async function buildLeaseDocumentData(leaseId: string): Promise<LeaseDocumentData | null> {
    const lease = await prisma.lease.findUnique({
        where: { id: leaseId },
        include: {
            tenant: true,
            apartment: { include: { company: true, building: true } },
        },
    })
    if (!lease) return null

    const { tenant, apartment: apt } = lease
    const building = apt.building
    const company = apt.company

    const [settingRows, previousLease] = await Promise.all([
        prisma.setting.findMany({ where: { key: { in: [...Object.values(K), 'irl_indices'] } } }),
        prisma.lease.findFirst({
            where: { apartmentId: apt.id, id: { not: lease.id }, startDate: { lt: lease.startDate } },
            orderBy: { startDate: 'desc' },
        }),
    ])
    const settings = new Map(settingRows.map(r => [r.key, r.value]))

    const values: Record<string, string | boolean> = {}
    const missing: MissingItem[] = []
    const warnings: string[] = []

    const href = {
        tenant: `/tenants/${tenant.id}/edit`,
        apartment: `/apartments/${apt.id}/edit`,
        building: building ? `/buildings/${building.id}/edit` : `/apartments/${apt.id}/edit`,
        company: company ? `/companies/${company.id}/edit` : `/apartments/${apt.id}/edit`,
        lease: `/leases/${lease.id}/edit`,
        settings: '/gestion/parametres',
    }
    const need = (area: MissingArea, label: string) => missing.push({ label, area, href: href[area] })

    const put = (key: string, value: string | boolean | null | undefined) => {
        if (!CATALOG_BY_KEY.has(key)) throw new Error(`Champ hors catalogue : ${key}`)
        if (typeof value === 'boolean') { values[key] = value; return }
        if (value !== null && value !== undefined && value !== '') values[key] = value
    }

    // ── Type de bail et templates ────────────────────────────────────────────
    const rawType = lease.leaseType ?? apt.defaultLeaseType
    const leaseType: LeaseType | null = rawType && rawType in TEMPLATE_KEY ? (rawType as LeaseType) : null
    if (!leaseType) need('lease', 'Type de bail (nu, meublé ou colocation)')

    const isPrivateGuarantor = lease.guarantorType === 'PRIVATE'
    const needsGuaranteeAct = isPrivateGuarantor

    const parseId = (key: string): number | null => {
        const n = parseInt(settings.get(key) ?? '', 10)
        return Number.isFinite(n) && n > 0 ? n : null
    }
    const templates = {
        bail: leaseType ? parseId(TEMPLATE_KEY[leaseType]) : null,
        caution: parseId(K.tplCaution),
    }
    if (!presentFlag(settings.get(K.url)) || !presentFlag(settings.get(K.apiKey))) {
        need('settings', 'Connexion DocuSeal (URL et clé API)')
    }
    if (leaseType && !templates.bail) need('settings', `Template DocuSeal du bail « ${TYPE_LABEL[leaseType]} »`)
    if (needsGuaranteeAct && !templates.caution) need('settings', "Template DocuSeal de l'acte de cautionnement")

    // ── Bailleur ─────────────────────────────────────────────────────────────
    const landlordName = company?.leaseDisplayName?.trim() || company?.name?.trim() || ''
    if (!company) {
        need('apartment', "Entité propriétaire de l'appartement")
    } else {
        if (!landlordName) need('company', 'Nom du bailleur sur les baux')
        if (!presentFlag(company.address)) need('company', 'Adresse de la société')
        if (!presentFlag(company.signerEmail)) need('company', 'Email du signataire des baux')
    }
    put('bailleur_nom', landlordName)
    put('bailleur_adresse', company?.address?.trim())
    put('bailleur_email', company?.signerEmail?.trim())
    put('bailleur_siret', company?.siret?.trim())

    // ── Locataire et colocataire ─────────────────────────────────────────────
    const putPerson = (prefix: string, p: { first: string; last: string; birth: Date | null; place: string | null; address: string | null; email: string | null }) => {
        put(`${prefix}_nom`, fullName(p.first, p.last))
        put(`${prefix}_prenom`, p.first.trim())
        put(`${prefix}_nom_famille`, p.last.trim().toUpperCase())
        put(`${prefix}_naissance`, p.birth ? formatDateFr(p.birth) : null)
        put(`${prefix}_naissance_long`, p.birth ? formatDateLongFr(p.birth) : null)
        put(`${prefix}_lieu_naissance`, p.place?.trim())
        put(`${prefix}_adresse`, p.address?.trim())
        put(`${prefix}_email`, p.email?.trim())
    }

    putPerson('locataire', { first: tenant.firstName, last: tenant.lastName, birth: tenant.birthDate, place: tenant.birthPlace, address: tenant.address, email: tenant.email })
    if (!tenant.birthDate) need('tenant', 'Date de naissance du locataire')
    if (!presentFlag(tenant.birthPlace)) need('tenant', 'Lieu de naissance du locataire')
    if (!presentFlag(tenant.address)) need('tenant', 'Adresse actuelle du locataire')

    const hasCoTenant = presentFlag(tenant.coTenantFirstName) || presentFlag(tenant.coTenantLastName)
    const coFirst = tenant.coTenantFirstName ?? ''
    const coLast = tenant.coTenantLastName ?? ''
    if (hasCoTenant && leaseType === 'COLOCATION') {
        warnings.push("Le colocataire n'apparaît pas dans un bail individuel de colocation : il aura son propre bail.")
    }
    const coTenantSigns = hasCoTenant && leaseType !== 'COLOCATION'
    if (coTenantSigns) {
        putPerson('colocataire', { first: coFirst, last: coLast, birth: tenant.coTenantBirthDate, place: tenant.coTenantBirthPlace, address: tenant.coTenantAddress, email: tenant.coTenantEmail })
        if (!presentFlag(tenant.coTenantEmail)) need('tenant', 'Email du colocataire')
        if (!tenant.coTenantBirthDate) need('tenant', 'Date de naissance du colocataire')
        if (!presentFlag(tenant.coTenantBirthPlace)) need('tenant', 'Lieu de naissance du colocataire')
        if (!presentFlag(tenant.coTenantAddress)) need('tenant', 'Adresse actuelle du colocataire')
    }

    // ── Garant ───────────────────────────────────────────────────────────────
    if (isPrivateGuarantor) {
        const gFirst = lease.guarantorFirstName ?? ''
        const gLast = lease.guarantorLastName ?? ''
        const guarantor = { first: gFirst, last: gLast, birth: lease.guarantorBirthDate, place: lease.guarantorBirthPlace, address: lease.guarantorAddress, email: lease.guarantorEmail }
        putPerson('garant', guarantor)
        putPerson('caution', guarantor)
        put('garant_telephone', lease.guarantorPhone?.trim())
        put('garant_nationalite', lease.guarantorNationality?.trim() || NATIONALITY_DEFAULT)
        if (!presentFlag(gFirst) || !presentFlag(gLast)) need('lease', 'Nom et prénom du garant')
        if (!presentFlag(lease.guarantorEmail)) need('lease', 'Email du garant')
        if (!lease.guarantorBirthDate) need('lease', 'Date de naissance du garant')
        if (!presentFlag(lease.guarantorBirthPlace)) need('lease', 'Lieu de naissance du garant')
        if (!presentFlag(lease.guarantorAddress)) need('lease', 'Adresse du garant')
    }

    // ── Logement ─────────────────────────────────────────────────────────────
    // Colocation : la chambre est un appartement et la surface / les pièces du
    // logement entier viennent de l'immeuble. Autres baux : celles de
    // l'appartement (un immeuble regroupe plusieurs logements de tailles
    // différentes). Type d'habitat, régime et année sont des faits d'immeuble.
    const surface = leaseType === 'COLOCATION' ? (building?.surface ?? apt.surface) : (apt.surface ?? building?.surface)
    const rooms = leaseType === 'COLOCATION' ? (building?.rooms ?? apt.rooms) : (apt.rooms ?? building?.rooms)
    const housingType = building?.housingType ?? apt.housingType
    const legalRegime = building?.legalRegime ?? apt.legalRegime
    const constructionYear = building?.constructionYear ?? apt.constructionYear

    const street = [apt.address, apt.complement].map(s => s?.trim()).filter(Boolean).join(', ')
    put('logement_adresse_rue', street)
    put('logement_code_postal', apt.zipCode)
    put('logement_ville', apt.city)
    put('logement_adresse', `${street}, ${apt.zipCode} ${apt.city}`)
    put('logement_pieces', rooms !== null && rooms !== undefined ? String(rooms) : null)
    put('logement_surface', surface !== null && surface !== undefined ? formatNumberFr(surface) : null)
    put('logement_etage', apt.floor?.trim())
    put('logement_code_porte', apt.doorCode?.trim())
    put('logement_cave', apt.cellarNumber?.trim() || 'néant')
    put('logement_parking', apt.hasParking ? 'oui' : 'néant')
    put('logement_dpe', apt.dpe?.trim())
    put('logement_annee_construction', constructionYear !== null && constructionYear !== undefined ? String(constructionYear) : null)
    put('logement_equipement_tic', apt.ictEquipment?.trim())
    put('logement_description_privatif', apt.descPrivate?.trim())
    put('logement_description_commun', apt.descCommon?.trim())
    put('logement_description_equipements', apt.descEquipment?.trim())

    if (surface === null || surface === undefined) need(leaseType === 'COLOCATION' && building ? 'building' : 'apartment', 'Surface habitable')
    if (rooms === null || rooms === undefined) need(leaseType === 'COLOCATION' && building ? 'building' : 'apartment', 'Nombre de pièces principales')
    if (!housingType) need(building ? 'building' : 'apartment', "Type d'habitat (collectif ou individuel)")
    if (!legalRegime) need(building ? 'building' : 'apartment', 'Régime juridique (copropriété ou monopropriété)')
    if (constructionYear === null || constructionYear === undefined) need(building ? 'building' : 'apartment', 'Année de construction')
    if (!apt.heatingMode) need('apartment', 'Chauffage (individuel ou collectif)')
    if (!apt.hotWaterMode) need('apartment', 'Eau chaude sanitaire (individuelle ou collective)')
    if (leaseType === 'COLOCATION') {
        if (!presentFlag(apt.dpe)) need('apartment', 'Niveau DPE')
        if (!presentFlag(apt.descPrivate)) need('apartment', 'Description des parties privatives')
        if (!presentFlag(apt.descCommon)) need('apartment', 'Description des parties communes')
    }

    put('habitat_collectif', housingType === 'COLLECTIVE')
    put('habitat_individuel', housingType === 'INDIVIDUAL')
    put('regime_copro', legalRegime === 'COPRO')
    put('regime_mono', legalRegime === 'MONO')
    const period = constructionPeriod(constructionYear ?? null)
    for (const p of ['avant_1949', '1949_1974', '1975_1989', '1989_2005', 'apres_2005']) put(`periode_${p}`, period === p)
    put('chauffage_individuel', apt.heatingMode === 'INDIVIDUAL')
    put('chauffage_collectif', apt.heatingMode === 'COLLECTIVE')
    put('ecs_individuelle', apt.hotWaterMode === 'INDIVIDUAL')
    put('ecs_collective', apt.hotWaterMode === 'COLLECTIVE')
    put('usage_habitation', true)

    const equipments = parseEquipments(apt.commonEquipments)
    for (const key of ['parking', 'ascenseur', 'gardiennage', 'antenne_tv', 'vide_ordures', 'interphone', 'espaces_verts', 'chauffage_collectif', 'eau_chaude_collective']) {
        put(`eq_${key}`, equipments.includes(key))
    }

    // ── Zone tendue ──────────────────────────────────────────────────────────
    const override = parseRentRulesOverride(lease.rentRulesOverride)
    const rules = {
        rentCapDecree: override?.rentCapDecree ?? apt.rentCapDecree,
        rentComplement: override?.rentComplement ?? apt.rentComplement,
        rentReferenceMajored: override?.rentReferenceMajored ?? apt.rentReferenceMajored,
        rentReassessed: override?.rentReassessed ?? apt.rentReassessed,
        referenceRentPerM2: override ? override.referenceRentPerM2 ?? null : apt.referenceRentPerM2,
        referenceRentMajoredPerM2: override ? override.referenceRentMajoredPerM2 ?? null : apt.referenceRentMajoredPerM2,
    }
    put('zt_decret_oui', rules.rentCapDecree)
    put('zt_decret_non', !rules.rentCapDecree)
    put('zt_complement_oui', rules.rentComplement)
    put('zt_complement_non', !rules.rentComplement)
    put('zt_majore_oui', rules.rentReferenceMajored)
    put('zt_majore_non', !rules.rentReferenceMajored)
    put('zt_reevalue_oui', rules.rentReassessed)
    put('zt_reevalue_non', !rules.rentReassessed)
    put('loyer_reference', rules.referenceRentPerM2 != null ? formatNumberFr(rules.referenceRentPerM2) : '-')
    put('loyer_reference_majore', rules.referenceRentMajoredPerM2 != null ? formatNumberFr(rules.referenceRentMajoredPerM2) : '-')

    if (previousLease) {
        const lastPaid = await prisma.rentPayment.findFirst({
            where: { leaseId: previousLease.id, status: { in: ['PAID', 'PARTIAL'] } },
            orderBy: { period: 'desc' },
        })
        const when = lastPaid?.paidAt ?? lastPaid?.period ?? previousLease.endDate
        put('dernier_loyer_precedent', formatEuros(previousLease.rentAmount))
        put('date_dernier_loyer_precedent', when ? formatDateFr(when) : null)
    }

    // ── Financier et durée ───────────────────────────────────────────────────
    const rent = lease.rentAmount
    const charges = lease.chargesAmount
    put('loyer_hc', formatEuros(rent))
    put('charges', formatEuros(charges))
    put('total_mensuel', formatEuros(rent + charges))
    if (lease.depositAmount !== null && lease.depositAmount !== undefined) put('depot_garantie', formatEuros(lease.depositAmount))
    else need('lease', 'Dépôt de garantie')
    put('charges_provision', lease.chargesMode !== 'FORFAIT')
    put('charges_forfait', lease.chargesMode === 'FORFAIT')
    put('charges_detail', apt.chargesDetail?.trim())
    if (lease.chargesMode === 'FORFAIT' && !presentFlag(apt.chargesDetail)) warnings.push('Forfait de charges sans « détail des charges » sur la fiche appartement.')
    put('assureur', lease.insurerName?.trim())

    const months = lease.durationMonths ?? (leaseType ? DEFAULT_DURATION_MONTHS[leaseType] : 12)
    const start = lease.startDate
    const end = lease.endDate ?? addMonthsMinusOneDay(start, months)
    put('duree', durationLabel(months))
    put('date_debut', formatDateFr(start))
    put('date_debut_long', formatDateLongFr(start))
    put('date_fin', formatDateFr(end))
    put('date_fin_long', formatDateLongFr(end))
    put('date_revision', formatDayMonthFr(start))

    // Indice de référence : celui du bail, sinon le dernier trimestre publié avant l'entrée.
    let indices: IrlIndex[] = DEFAULT_IRL_INDICES
    try {
        const raw = settings.get('irl_indices')
        if (raw) indices = JSON.parse(raw) as IrlIndex[]
    } catch { /* paramètre illisible : valeurs par défaut */ }
    const irlQuarter = lease.irlBaseQuarter ?? previousQuarterOf(start)
    const irlValue = lease.irlBaseIndex ?? findIndex(indices, irlQuarter)?.value
    if (irlValue === undefined) {
        need('settings', `Indice IRL du ${irlQuarterLabel(irlQuarter)} (Paramètres → Indices IRL)`)
    } else {
        put('irl_trimestre', irlQuarterLabel(irlQuarter))
        put('irl_valeur', formatNumberFr(irlValue))
    }

    // ── Acte de cautionnement ────────────────────────────────────────────────
    put('loyer_chiffres', formatEuros(rent))
    put('loyer_lettres', amountToFrenchWords(rent))
    const cap = Math.round(rent * 12 * 100) / 100
    put('plafond_chiffres', formatEuros(cap))
    put('plafond_lettres', amountToFrenchWords(cap))
    put('duree_engagement', 'indéterminée')

    // ── Signataires ──────────────────────────────────────────────────────────
    const landlordSigner: Signer = { role: SIGNER_ROLES.BAILLEUR, name: landlordName, email: company?.signerEmail?.trim() ?? '' }
    const tenantSigner: Signer = { role: SIGNER_ROLES.LOCATAIRE, name: fullName(tenant.firstName, tenant.lastName), email: tenant.email }
    const bailSigners: Signer[] = [landlordSigner, tenantSigner]
    if (coTenantSigns) {
        bailSigners.push({ role: SIGNER_ROLES.COLOCATAIRE, name: fullName(coFirst, coLast), email: tenant.coTenantEmail?.trim() ?? '' })
    }
    const guarantorSigner: Signer | null = isPrivateGuarantor
        ? { role: SIGNER_ROLES.CAUTION, name: fullName(lease.guarantorFirstName ?? '', lease.guarantorLastName ?? ''), email: lease.guarantorEmail?.trim() ?? '' }
        : null
    // Dans un bail nu ou meublé, le garant signe aussi le bail lui-même.
    if (guarantorSigner && leaseType !== 'COLOCATION') bailSigners.push(guarantorSigner)
    const cautionSigners: Signer[] = guarantorSigner ? [guarantorSigner] : []

    const seen = new Map<string, string>()
    for (const s of bailSigners) {
        const key = s.email.toLowerCase()
        if (!key) continue
        if (seen.has(key)) warnings.push(`Le même email (${s.email}) sert pour deux signataires : ${seen.get(key)} et ${s.role}.`)
        else seen.set(key, s.role)
    }

    return {
        leaseId,
        leaseType,
        needsGuaranteeAct,
        templates,
        values,
        signers: { bail: bailSigners, caution: cautionSigners },
        missing,
        warnings,
    }
}

/** Documents à générer pour ce bail. */
export function documentsToGenerate(data: Pick<LeaseDocumentData, 'needsGuaranteeAct'>): DocKind[] {
    return data.needsGuaranteeAct ? ['BAIL', 'CAUTION'] : ['BAIL']
}
