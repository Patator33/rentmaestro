/**
 * Catalogue des champs DocuSeal : noms à poser dans les templates, et ce que
 * RentMaestro y met. La source de vérité des noms ; `lease-document.ts` calcule
 * les valeurs, `docs/champs-docuseal.md` en est la version lisible.
 */
import type { LeaseType } from '@/lib/lease-options'

export type FieldKind = 'text' | 'checkbox'
export type DocKind = 'BAIL' | 'CAUTION'

export interface CatalogField {
    key: string
    label: string
    kind: FieldKind
    /** Documents où le champ a du sens. */
    docs: DocKind[]
    /** Types de bail concernés (tous si absent). */
    types?: LeaseType[]
}

/** Rôles DocuSeal attendus dans les templates. */
export const SIGNER_ROLES = {
    BAILLEUR: 'Bailleur',
    LOCATAIRE: 'Locataire',
    COLOCATAIRE: 'Colocataire',
    CAUTION: 'Caution',
} as const

const B: DocKind[] = ['BAIL']
const C: DocKind[] = ['CAUTION']
const BC: DocKind[] = ['BAIL', 'CAUTION']
const NOT_COLOC: LeaseType[] = ['NU', 'MEUBLE']
const NOT_NU: LeaseType[] = ['MEUBLE', 'COLOCATION']

function t(key: string, label: string, docs: DocKind[] = B, types?: LeaseType[]): CatalogField {
    return { key, label, kind: 'text', docs, types }
}
function c(key: string, label: string, docs: DocKind[] = B, types?: LeaseType[]): CatalogField {
    return { key, label, kind: 'checkbox', docs, types }
}

/** Une personne : nom complet, prénom, nom, naissance (courte et longue), lieu, adresse, email. */
function person(prefix: string, who: string, docs: DocKind[], types?: LeaseType[]): CatalogField[] {
    return [
        t(`${prefix}_nom`, `${who} : nom complet (Prénom NOM)`, docs, types),
        t(`${prefix}_prenom`, `${who} : prénom`, docs, types),
        t(`${prefix}_nom_famille`, `${who} : nom de famille`, docs, types),
        t(`${prefix}_naissance`, `${who} : date de naissance (JJ/MM/AAAA)`, docs, types),
        t(`${prefix}_naissance_long`, `${who} : date de naissance (30 août 1982)`, docs, types),
        t(`${prefix}_lieu_naissance`, `${who} : lieu de naissance`, docs, types),
        t(`${prefix}_adresse`, `${who} : adresse actuelle`, docs, types),
        t(`${prefix}_email`, `${who} : email`, docs, types),
    ]
}

export const LEASE_CATALOG: CatalogField[] = [
    // ── Parties ──────────────────────────────────────────────────────────────
    t('bailleur_nom', 'Bailleur : nom sur le bail', BC),
    t('bailleur_adresse', 'Bailleur : adresse', BC),
    t('bailleur_email', 'Bailleur : email'),
    t('bailleur_siret', 'Bailleur : SIRET'),
    ...person('locataire', 'Locataire', BC),
    ...person('colocataire', 'Colocataire', B, NOT_COLOC),
    ...person('garant', 'Garant', B, NOT_COLOC),
    t('garant_telephone', 'Garant : téléphone', B, NOT_COLOC),
    t('garant_nationalite', 'Garant : nationalité', B, NOT_COLOC),
    ...person('caution', 'Caution (acte de cautionnement)', C),

    // ── Logement ─────────────────────────────────────────────────────────────
    t('logement_adresse', 'Logement : adresse complète', BC),
    t('logement_adresse_rue', 'Logement : rue et complément'),
    t('logement_code_postal', 'Logement : code postal'),
    t('logement_ville', 'Logement : ville'),
    t('logement_pieces', 'Logement : pièces principales'),
    t('logement_surface', 'Logement : surface habitable (nombre, sans m²)'),
    t('logement_etage', 'Logement : étage'),
    t('logement_code_porte', 'Logement : code porte'),
    t('logement_cave', 'Logement : n° de cave (« néant » si aucune)'),
    t('logement_parking', 'Logement : parking (« oui » ou « néant »)'),
    t('logement_dpe', 'Logement : niveau DPE'),
    t('logement_annee_construction', 'Logement : année de construction'),
    t('logement_equipement_tic', 'Logement : accès internet / TV'),
    t('logement_description_privatif', 'Logement : parties privatives (texte libre)', B, ['COLOCATION']),
    t('logement_description_commun', 'Logement : parties communes (texte libre)', B, ['COLOCATION']),
    t('logement_description_equipements', 'Logement : éléments d\'équipement (texte libre)'),

    c('habitat_collectif', 'Type d\'habitat : immeuble collectif'),
    c('habitat_individuel', 'Type d\'habitat : immeuble individuel'),
    c('regime_copro', 'Régime juridique : copropriété'),
    c('regime_mono', 'Régime juridique : monopropriété'),
    c('periode_avant_1949', 'Construction : avant 1949'),
    c('periode_1949_1974', 'Construction : 1949 à 1974'),
    c('periode_1975_1989', 'Construction : 1975 à 1989'),
    c('periode_1989_2005', 'Construction : 1989 à 2005'),
    c('periode_apres_2005', 'Construction : après 2005'),
    c('chauffage_individuel', 'Chauffage individuel'),
    c('chauffage_collectif', 'Chauffage collectif'),
    c('ecs_individuelle', 'Eau chaude sanitaire individuelle'),
    c('ecs_collective', 'Eau chaude sanitaire collective'),
    c('usage_habitation', 'Usage : habitation principale'),

    // ── Équipements communs (cochés d'après la fiche appartement) ───────────
    c('eq_parking', 'Équipement commun : parking', B, NOT_COLOC),
    c('eq_ascenseur', 'Équipement commun : ascenseur', B, NOT_COLOC),
    c('eq_gardiennage', 'Équipement commun : gardiennage', B, NOT_COLOC),
    c('eq_antenne_tv', 'Équipement commun : antenne TV collective', B, NOT_COLOC),
    c('eq_vide_ordures', 'Équipement commun : vide-ordures', B, NOT_COLOC),
    c('eq_interphone', 'Équipement commun : interphone', B, NOT_COLOC),
    c('eq_espaces_verts', 'Équipement commun : espace(s) vert(s)', B, NOT_COLOC),
    c('eq_chauffage_collectif', 'Équipement commun : chauffage collectif', B, NOT_COLOC),
    c('eq_eau_chaude_collective', 'Équipement commun : eau chaude collective', B, NOT_COLOC),

    // ── Zone tendue ──────────────────────────────────────────────────────────
    c('zt_decret_oui', 'Décret d\'encadrement : Oui'),
    c('zt_decret_non', 'Décret d\'encadrement : Non'),
    c('zt_complement_oui', 'Complément de loyer : Oui'),
    c('zt_complement_non', 'Complément de loyer : Non'),
    c('zt_majore_oui', 'Loyer de référence majoré : Oui', B, NOT_COLOC),
    c('zt_majore_non', 'Loyer de référence majoré : Non', B, NOT_COLOC),
    c('zt_reevalue_oui', 'Loyer réévalué : Oui', B, NOT_COLOC),
    c('zt_reevalue_non', 'Loyer réévalué : Non', B, NOT_COLOC),
    t('loyer_reference', 'Loyer de référence (€/m²)', B, NOT_COLOC),
    t('loyer_reference_majore', 'Loyer de référence majoré (€/m²)', B, NOT_COLOC),
    t('dernier_loyer_precedent', 'Dernier loyer du précédent locataire', B, NOT_COLOC),
    t('date_dernier_loyer_precedent', 'Date de versement de ce loyer', B, NOT_COLOC),

    // ── Financier et durée ───────────────────────────────────────────────────
    t('loyer_hc', 'Loyer hors charges (« 710 € »)', BC),
    t('charges', 'Charges (provision ou forfait)'),
    t('total_mensuel', 'Total mensuel charges comprises'),
    t('depot_garantie', 'Dépôt de garantie'),
    t('charges_detail', 'Détail des charges comprises', B, NOT_NU),
    c('charges_provision', 'Charges : provision sur charges'),
    c('charges_forfait', 'Charges : forfait de charges'),
    t('assureur', 'Assureur multirisque habitation'),
    t('duree', 'Durée du bail (« 1 an », « 3 ans »)'),
    t('date_debut', 'Date de prise d\'effet (JJ/MM/AAAA)'),
    t('date_debut_long', 'Date de prise d\'effet (30 août 2026)'),
    t('date_fin', 'Date de fin (JJ/MM/AAAA)'),
    t('date_fin_long', 'Date de fin (29 août 2027)'),
    t('irl_trimestre', 'Indice de référence : trimestre (« 2ème trimestre 2026 »)', BC),
    t('irl_valeur', 'Indice de référence : valeur'),
    t('date_revision', 'Date anniversaire de révision (« 30 août »)', BC),

    // ── Acte de cautionnement ────────────────────────────────────────────────
    t('loyer_chiffres', 'Loyer mensuel en chiffres', C),
    t('loyer_lettres', 'Loyer mensuel en lettres', C),
    t('plafond_chiffres', 'Plafond de l\'engagement (12 × loyer) en chiffres', C),
    t('plafond_lettres', 'Plafond de l\'engagement en lettres', C),
    t('duree_engagement', 'Durée de l\'engagement (« indéterminée »)', C),
]

export const CATALOG_BY_KEY: Map<string, CatalogField> = new Map(LEASE_CATALOG.map(f => [f.key, f]))

/** Champs du catalogue pertinents pour un document et un type de bail. */
export function catalogFor(doc: DocKind, type: LeaseType | null): CatalogField[] {
    return LEASE_CATALOG.filter(f => f.docs.includes(doc) && (!f.types || !type || f.types.includes(type)))
}
