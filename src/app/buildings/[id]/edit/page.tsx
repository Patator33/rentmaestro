import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { updateBuilding } from '@/actions/buildings';
import styles from '../../../apartments/new/page.module.css';

export default async function EditBuildingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const [building, companies] = await Promise.all([
        prisma.building.findUnique({ where: { id } }),
        prisma.company.findMany({ orderBy: { name: 'asc' } }),
    ]);

    if (!building) notFound();

    const updateBuildingWithId = updateBuilding.bind(null, building.id);

    return (
        <div className={styles.container}>
            <Link href="/buildings" className={styles.backLink}>← Annuler</Link>
            <h1 className={styles.title}>Modifier l'immeuble</h1>

            <form action={updateBuildingWithId} className={styles.form}>
                <div className={styles.formGroup}>
                    <label htmlFor="name" className={styles.label}>Nom de l'immeuble *</label>
                    <input type="text" id="name" name="name" required defaultValue={building.name} className={styles.input} />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="address" className={styles.label}>Adresse (rue) *</label>
                    <input type="text" id="address" name="address" required defaultValue={building.address} className={styles.input} />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="complement" className={styles.label}>Complément d'adresse</label>
                    <input type="text" id="complement" name="complement" defaultValue={(building as any).complement || ''} className={styles.input} placeholder="Bâtiment A, Résidence..." />
                </div>

                <div className={styles.row}>
                    <div className={styles.formGroup}>
                        <label htmlFor="zipCode" className={styles.label}>Code postal</label>
                        <input type="text" id="zipCode" name="zipCode" defaultValue={(building as any).zipCode || ''} className={styles.input} placeholder="75000" pattern="^\d{5}$" title="5 chiffres" />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="city" className={styles.label}>Ville</label>
                        <input type="text" id="city" name="city" defaultValue={(building as any).city || ''} className={styles.input} placeholder="Paris" />
                    </div>
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="companyId" className={styles.label}>Entité propriétaire (Optionnel)</label>
                    <select id="companyId" name="companyId" defaultValue={building.companyId || ''} className={styles.input}>
                        <option value="">En nom propre</option>
                        {companies.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                        ))}
                    </select>
                </div>

                <button type="submit" className={styles.submitButton}>Enregistrer les modifications</button>
            </form>
        </div>
    );
}
