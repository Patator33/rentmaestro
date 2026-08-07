import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { createBuilding } from '@/actions/buildings';
import { BUILDING_EXPENSE_FIELDS } from '@/lib/building-expenses';
import styles from '../../apartments/new/page.module.css';

export default async function NewBuildingPage() {
    const companies = await prisma.company.findMany({ orderBy: { name: 'asc' } });

    return (
        <div className={styles.container}>
            <Link href="/buildings" className={styles.backLink}>← Retour aux immeubles</Link>
            <h1 className={styles.title}>Ajouter un immeuble</h1>

            <form action={createBuilding} className={styles.form}>
                <div className={styles.formGroup}>
                    <label htmlFor="name" className={styles.label}>Nom de l'immeuble *</label>
                    <input type="text" id="name" name="name" required className={styles.input} placeholder="Résidence Les Lilas, Immeuble du Centre..." />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="address" className={styles.label}>Adresse (rue) *</label>
                    <input type="text" id="address" name="address" required className={styles.input} placeholder="12 rue de la Paix" />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="complement" className={styles.label}>Complément d'adresse</label>
                    <input type="text" id="complement" name="complement" className={styles.input} placeholder="Bâtiment A, Résidence..." />
                </div>

                <div className={styles.row}>
                    <div className={styles.formGroup}>
                        <label htmlFor="zipCode" className={styles.label}>Code postal</label>
                        <input type="text" id="zipCode" name="zipCode" className={styles.input} placeholder="75000" pattern="^\d{5}$" title="5 chiffres" />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="city" className={styles.label}>Ville</label>
                        <input type="text" id="city" name="city" className={styles.input} placeholder="Paris" />
                    </div>
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="companyId" className={styles.label}>Entité propriétaire (Optionnel)</label>
                    <select id="companyId" name="companyId" className={styles.input}>
                        <option value="">En nom propre</option>
                        {companies.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                        ))}
                    </select>
                </div>

                <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '1.5rem 0 0.25rem' }}>Charges communes mensuelles</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    Réparties entre les appartements de l'immeuble dans le calcul du Cash Flow Net Net.
                </p>
                <div className={styles.row} style={{ flexWrap: 'wrap' }}>
                    {BUILDING_EXPENSE_FIELDS.map(f => (
                        <div key={f.key} className={styles.formGroup} style={{ minWidth: '140px' }}>
                            <label htmlFor={f.key} className={styles.label}>{f.label} (€/mois)</label>
                            <input type="number" step="0.01" min="0" id={f.key} name={f.key} defaultValue={0} className={styles.input} />
                        </div>
                    ))}
                </div>

                <button type="submit" className={styles.submitButton}>Enregistrer</button>
            </form>
        </div>
    );
}
