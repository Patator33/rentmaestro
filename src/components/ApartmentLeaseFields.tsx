import styles from '@/app/apartments/new/page.module.css';
import {
    LEASE_TYPES, HOUSING_TYPES, LEGAL_REGIMES, HEATING_MODES, COMMON_EQUIPMENTS, parseEquipments,
} from '@/lib/lease-options';

const sectionTitle = { fontSize: '0.95rem', fontWeight: 700, margin: '1.5rem 0 0.25rem' } as const;
const hint = { fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' } as const;
const checkLabel = { display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', textTransform: 'none', letterSpacing: 'normal', fontFamily: 'inherit' } as const;

type Apt = {
    rooms?: number | null; floor?: string | null; doorCode?: string | null; cellarNumber?: string | null;
    hasParking?: boolean; housingType?: string | null; legalRegime?: string | null; constructionYear?: number | null;
    heatingMode?: string | null; hotWaterMode?: string | null; commonEquipments?: string | null;
    rentCapDecree?: boolean; rentComplement?: boolean; rentReferenceMajored?: boolean; rentReassessed?: boolean;
    referenceRentPerM2?: number | null; referenceRentMajoredPerM2?: number | null;
    descPrivate?: string | null; descCommon?: string | null; descEquipment?: string | null;
    chargesDetail?: string | null; ictEquipment?: string | null; defaultLeaseType?: string | null;
};

/**
 * Données du logement reprises dans les baux générés (DocuSeal). Champs non
 * contrôlés : à placer dans le <form> de l'appartement ; lus par
 * `readApartmentLeaseData` (src/lib/lease-options.ts).
 */
export default function ApartmentLeaseFields({ apartment }: { apartment?: Apt | null }) {
    const a = apartment ?? {};
    const equipments = parseEquipments(a.commonEquipments);

    return (
        <details style={{ marginTop: '1.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem' }}>
                Données du bail (génération et signature DocuSeal)
            </summary>

            <p style={{ ...hint, marginTop: '0.75rem' }}>
                Reprises dans le bail généré. Le type d'habitat, le régime juridique et l'année de construction de
                l'immeuble priment sur ceux de l'appartement. Pour une colocation, la surface et le nombre de pièces
                de l'immeuble priment aussi (la chambre est un appartement du logement entier).
            </p>

            <div className={styles.formGroup}>
                <label htmlFor="defaultLeaseType" className={styles.label}>Type de bail par défaut</label>
                <select id="defaultLeaseType" name="defaultLeaseType" defaultValue={a.defaultLeaseType ?? ''} className={styles.input}>
                    <option value="">Non défini</option>
                    {LEASE_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            </div>

            <div className={styles.row}>
                <div className={styles.formGroup}>
                    <label htmlFor="rooms" className={styles.label}>Pièces principales</label>
                    <input type="number" min="0" step="1" id="rooms" name="rooms" defaultValue={a.rooms ?? ''} className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="floor" className={styles.label}>Étage</label>
                    <input type="text" id="floor" name="floor" defaultValue={a.floor ?? ''} className={styles.input} placeholder="RDC, 2e..." />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="doorCode" className={styles.label}>Code porte</label>
                    <input type="text" id="doorCode" name="doorCode" defaultValue={a.doorCode ?? ''} className={styles.input} />
                </div>
            </div>

            <div className={styles.row}>
                <div className={styles.formGroup}>
                    <label htmlFor="cellarNumber" className={styles.label}>N° de cave</label>
                    <input type="text" id="cellarNumber" name="cellarNumber" defaultValue={a.cellarNumber ?? ''} className={styles.input} placeholder="néant" />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="constructionYear" className={styles.label}>Année de construction</label>
                    <input type="number" min="1000" max="2100" step="1" id="constructionYear" name="constructionYear" defaultValue={a.constructionYear ?? ''} className={styles.input} placeholder="1900" />
                </div>
                <div className={styles.formGroup} style={{ justifyContent: 'flex-end' }}>
                    <label style={{ ...checkLabel, marginTop: '1.6rem' }}>
                        <input type="checkbox" name="hasParking" defaultChecked={!!a.hasParking} style={{ accentColor: 'var(--primary-color)' }} />
                        Parking inclus
                    </label>
                </div>
            </div>

            <div className={styles.row}>
                <div className={styles.formGroup}>
                    <label htmlFor="housingType" className={styles.label}>Type d'habitat</label>
                    <select id="housingType" name="housingType" defaultValue={a.housingType ?? ''} className={styles.input}>
                        <option value="">Non renseigné</option>
                        {HOUSING_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="legalRegime" className={styles.label}>Régime juridique</label>
                    <select id="legalRegime" name="legalRegime" defaultValue={a.legalRegime ?? ''} className={styles.input}>
                        <option value="">Non renseigné</option>
                        {LEGAL_REGIMES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
            </div>

            <div className={styles.row}>
                <div className={styles.formGroup}>
                    <label htmlFor="heatingMode" className={styles.label}>Chauffage</label>
                    <select id="heatingMode" name="heatingMode" defaultValue={a.heatingMode ?? ''} className={styles.input}>
                        <option value="">Non renseigné</option>
                        {HEATING_MODES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="hotWaterMode" className={styles.label}>Eau chaude sanitaire</label>
                    <select id="hotWaterMode" name="hotWaterMode" defaultValue={a.hotWaterMode ?? ''} className={styles.input}>
                        <option value="">Non renseigné</option>
                        {HEATING_MODES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
            </div>

            <h3 style={sectionTitle}>Équipements et parties communes</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.25rem', marginBottom: '0.75rem' }}>
                {COMMON_EQUIPMENTS.map(e => (
                    <label key={e.key} style={checkLabel}>
                        <input type="checkbox" name="commonEquipments" value={e.key} defaultChecked={equipments.includes(e.key)} style={{ accentColor: 'var(--primary-color)' }} />
                        {e.label}
                    </label>
                ))}
            </div>

            <h3 style={sectionTitle}>Zone tendue</h3>
            <p style={hint}>Réponses du bail (cochée = « Oui »). Un bail peut les remplacer au cas par cas.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
                <label style={checkLabel}><input type="checkbox" name="rentCapDecree" defaultChecked={!!a.rentCapDecree} style={{ accentColor: 'var(--primary-color)' }} />Loyer soumis au décret d'encadrement de l'évolution des loyers à la relocation</label>
                <label style={checkLabel}><input type="checkbox" name="rentComplement" defaultChecked={!!a.rentComplement} style={{ accentColor: 'var(--primary-color)' }} />Le loyer comprend un complément de loyer</label>
                <label style={checkLabel}><input type="checkbox" name="rentReferenceMajored" defaultChecked={!!a.rentReferenceMajored} style={{ accentColor: 'var(--primary-color)' }} />Soumis au loyer de référence majoré (arrêté préfectoral)</label>
                <label style={checkLabel}><input type="checkbox" name="rentReassessed" defaultChecked={!!a.rentReassessed} style={{ accentColor: 'var(--primary-color)' }} />Le loyer fait l'objet d'une réévaluation</label>
            </div>
            <div className={styles.row}>
                <div className={styles.formGroup}>
                    <label htmlFor="referenceRentPerM2" className={styles.label}>Loyer de référence (€/m²)</label>
                    <input type="number" step="0.01" min="0" id="referenceRentPerM2" name="referenceRentPerM2" defaultValue={a.referenceRentPerM2 ?? ''} className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="referenceRentMajoredPerM2" className={styles.label}>Loyer de référence majoré (€/m²)</label>
                    <input type="number" step="0.01" min="0" id="referenceRentMajoredPerM2" name="referenceRentMajoredPerM2" defaultValue={a.referenceRentMajoredPerM2 ?? ''} className={styles.input} />
                </div>
            </div>

            <h3 style={sectionTitle}>Textes libres repris dans le bail</h3>
            <div className={styles.formGroup}>
                <label htmlFor="descPrivate" className={styles.label}>Parties privatives (colocation : la chambre)</label>
                <textarea id="descPrivate" name="descPrivate" defaultValue={a.descPrivate ?? ''} className={styles.textarea} rows={4} />
            </div>
            <div className={styles.formGroup}>
                <label htmlFor="descCommon" className={styles.label}>Parties communes (colocation)</label>
                <textarea id="descCommon" name="descCommon" defaultValue={a.descCommon ?? ''} className={styles.textarea} rows={4} />
            </div>
            <div className={styles.formGroup}>
                <label htmlFor="descEquipment" className={styles.label}>Éléments d'équipement du logement</label>
                <textarea id="descEquipment" name="descEquipment" defaultValue={a.descEquipment ?? ''} className={styles.textarea} rows={2} placeholder="cuisine équipée, 5 salles d'eau..." />
            </div>
            <div className={styles.formGroup}>
                <label htmlFor="chargesDetail" className={styles.label}>Détail des charges comprises</label>
                <textarea id="chargesDetail" name="chargesDetail" defaultValue={a.chargesDetail ?? ''} className={styles.textarea} rows={2} placeholder="eau, électricité, gaz, internet, ménage des parties communes..." />
            </div>
            <div className={styles.formGroup}>
                <label htmlFor="ictEquipment" className={styles.label}>Accès internet / TV</label>
                <input type="text" id="ictEquipment" name="ictEquipment" defaultValue={a.ictEquipment ?? ''} className={styles.input} placeholder="Abonnement internet fourni avec option TV" />
            </div>
        </details>
    );
}
