import styles from '@/app/apartments/new/page.module.css';
import { HOUSING_TYPES, LEGAL_REGIMES } from '@/lib/lease-options';

type Bld = {
    surface?: number | null; rooms?: number | null; housingType?: string | null;
    legalRegime?: string | null; constructionYear?: number | null;
};

/**
 * Données du logement entier, reprises dans les baux de ses appartements
 * (colocation : chaque chambre est un appartement de l'immeuble). Lues par
 * `readBuildingHousingData` (src/lib/lease-options.ts).
 */
export default function BuildingHousingFields({ building }: { building?: Bld | null }) {
    const b = building ?? {};
    return (
        <>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '1.5rem 0 0.25rem' }}>Logement entier (baux)</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Reprises dans les baux des appartements de l'immeuble ; elles priment sur celles de l'appartement.
            </p>
            <div className={styles.row}>
                <div className={styles.formGroup}>
                    <label htmlFor="surface" className={styles.label}>Surface habitable (m²)</label>
                    <input type="number" step="0.1" min="0" id="surface" name="surface" defaultValue={b.surface ?? ''} className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="rooms" className={styles.label}>Pièces principales</label>
                    <input type="number" step="1" min="0" id="rooms" name="rooms" defaultValue={b.rooms ?? ''} className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="constructionYear" className={styles.label}>Année de construction</label>
                    <input type="number" step="1" min="1000" max="2100" id="constructionYear" name="constructionYear" defaultValue={b.constructionYear ?? ''} className={styles.input} />
                </div>
            </div>
            <div className={styles.row}>
                <div className={styles.formGroup}>
                    <label htmlFor="housingType" className={styles.label}>Type d'habitat</label>
                    <select id="housingType" name="housingType" defaultValue={b.housingType ?? ''} className={styles.input}>
                        <option value="">Non renseigné</option>
                        {HOUSING_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="legalRegime" className={styles.label}>Régime juridique</label>
                    <select id="legalRegime" name="legalRegime" defaultValue={b.legalRegime ?? ''} className={styles.input}>
                        <option value="">Non renseigné</option>
                        {LEGAL_REGIMES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
            </div>
        </>
    );
}
