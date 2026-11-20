'use client'

import { useState } from 'react'
import styles from '@/app/leases/new/page.module.css'
import {
    LEASE_TYPES, CHARGES_MODES, DEFAULT_DURATION_MONTHS, type LeaseType, type RentRulesOverride,
} from '@/lib/lease-options'

type Props = {
    /** Type enregistré sur le bail (null = on reprend celui de l'appartement). */
    leaseType?: string | null
    /** Type par défaut de l'appartement choisi. */
    apartmentDefaultType?: string | null
    chargesMode?: string | null
    durationMonths?: number | null
    insurerName?: string | null
    /** Exception « zone tendue » déjà enregistrée sur le bail. */
    rentRulesOverride?: RentRulesOverride | null
    /** Valeurs « zone tendue » de l'appartement, point de départ de l'exception. */
    apartmentRules?: RentRulesOverride | null
}

const RULES: { key: 'rentCapDecree' | 'rentComplement' | 'rentReferenceMajored' | 'rentReassessed'; label: string }[] = [
    { key: 'rentCapDecree', label: "Soumis au décret d'encadrement de l'évolution des loyers" },
    { key: 'rentComplement', label: 'Complément de loyer' },
    { key: 'rentReferenceMajored', label: 'Soumis au loyer de référence majoré' },
    { key: 'rentReassessed', label: 'Loyer réévalué' },
]

const checkLabel = { display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', textTransform: 'none', letterSpacing: 'normal', fontFamily: 'inherit' } as const

/**
 * Données du bail propres à la génération DocuSeal. Champs non contrôlés
 * côté serveur : lus par `readLeaseGenerationData` (src/lib/lease-options.ts).
 */
export default function LeaseGenerationFields({
    leaseType, apartmentDefaultType, chargesMode, durationMonths, insurerName, rentRulesOverride, apartmentRules,
}: Props) {
    const initialType = (leaseType || apartmentDefaultType || '') as LeaseType | ''
    const [type, setType] = useState<LeaseType | ''>(initialType)
    const [overrideOn, setOverrideOn] = useState(!!rentRulesOverride)

    const base = rentRulesOverride ?? apartmentRules ?? {}
    const durationPlaceholder = type ? `${DEFAULT_DURATION_MONTHS[type]} (par défaut)` : 'Selon le type de bail'

    return (
        <details style={{ marginTop: '1.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem' }}>
                Données du bail (génération et signature DocuSeal)
            </summary>

            <div className={styles.formGroup} style={{ marginTop: '0.75rem' }}>
                <label htmlFor="leaseType" className={styles.label}>Type de bail</label>
                <select id="leaseType" name="leaseType" value={type} onChange={e => setType(e.target.value as LeaseType | '')} className={styles.select}>
                    <option value="">{apartmentDefaultType ? 'Celui de l\'appartement' : 'Non défini'}</option>
                    {LEASE_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            </div>

            <div className={styles.row}>
                <div className={styles.formGroup}>
                    <label htmlFor="chargesMode" className={styles.label}>Charges</label>
                    <select id="chargesMode" name="chargesMode" defaultValue={chargesMode || 'PROVISION'} className={styles.select}>
                        {CHARGES_MODES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="durationMonths" className={styles.label}>Durée (mois)</label>
                    <input type="number" min="1" step="1" id="durationMonths" name="durationMonths" defaultValue={durationMonths ?? ''} placeholder={durationPlaceholder} className={styles.input} />
                </div>
            </div>

            <div className={styles.formGroup}>
                <label htmlFor="insurerName" className={styles.label}>Assureur multirisque habitation du locataire</label>
                <input type="text" id="insurerName" name="insurerName" defaultValue={insurerName ?? ''} className={styles.input} placeholder="MACIF..." />
            </div>

            <label style={{ ...checkLabel, marginTop: '0.5rem' }}>
                <input type="checkbox" name="rentRulesOverrideEnabled" checked={overrideOn} onChange={e => setOverrideOn(e.target.checked)} style={{ accentColor: 'var(--primary-color)' }} />
                Remplacer les réponses « zone tendue » de l'appartement pour ce bail
            </label>

            {overrideOn && (
                <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {RULES.map(r => (
                        <label key={r.key} style={checkLabel}>
                            <input type="checkbox" name={`ov_${r.key}`} defaultChecked={!!base[r.key]} style={{ accentColor: 'var(--primary-color)' }} />
                            {r.label}
                        </label>
                    ))}
                    <div className={styles.row} style={{ marginTop: '0.5rem' }}>
                        <div className={styles.formGroup}>
                            <label htmlFor="ovReferenceRentPerM2" className={styles.label}>Loyer de référence (€/m²)</label>
                            <input type="number" step="0.01" min="0" id="ovReferenceRentPerM2" name="ovReferenceRentPerM2" defaultValue={base.referenceRentPerM2 ?? ''} className={styles.input} />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="ovReferenceRentMajoredPerM2" className={styles.label}>Loyer de référence majoré (€/m²)</label>
                            <input type="number" step="0.01" min="0" id="ovReferenceRentMajoredPerM2" name="ovReferenceRentMajoredPerM2" defaultValue={base.referenceRentMajoredPerM2 ?? ''} className={styles.input} />
                        </div>
                    </div>
                </div>
            )}
        </details>
    )
}

/** Champs d'état civil du garant privé (à placer dans le bloc « Informations du garant »). */
export function GuarantorDetailsFields({
    birthDate, birthPlace, address, nationality,
}: { birthDate?: Date | string | null; birthPlace?: string | null; address?: string | null; nationality?: string | null }) {
    const d = birthDate ? new Date(birthDate) : null
    const dateStr = d && !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : ''
    return (
        <>
            <div className={styles.row}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Date de naissance</label>
                    <input type="date" name="guarantorBirthDate" defaultValue={dateStr} className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Lieu de naissance</label>
                    <input type="text" name="guarantorBirthPlace" defaultValue={birthPlace ?? ''} className={styles.input} />
                </div>
            </div>
            <div className={styles.row}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Adresse</label>
                    <input type="text" name="guarantorAddress" defaultValue={address ?? ''} className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Nationalité</label>
                    <input type="text" name="guarantorNationality" defaultValue={nationality ?? 'française'} className={styles.input} />
                </div>
            </div>
        </>
    )
}
