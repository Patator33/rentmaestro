'use client';

import { useState } from 'react';
import { createCompany, updateCompany } from '@/actions/companies';
import { Company } from '@prisma/client';
import styles from './CompanyForm.module.css';

interface Props {
    company?: Company;
}

export default function CompanyForm({ company }: Props) {
    const isEdit = !!company;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);

        try {
            if (isEdit) {
                await updateCompany(company.id, formData);
            } else {
                await createCompany(formData);
            }
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            {error && (
                <div style={{ padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', fontSize: '0.9rem' }}>
                    {error}
                </div>
            )}

            <div className={styles.formGroup}>
                <label htmlFor="name" className={styles.label}>Nom de l'entité *</label>
                <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    defaultValue={company?.name}
                    className={styles.input}
                    placeholder="Ex: SCI Les Hirondelles"
                />
            </div>

            <div className={styles.formGroup}>
                <label htmlFor="type" className={styles.label}>Type Juridique *</label>
                <select
                    id="type"
                    name="type"
                    required
                    defaultValue={company?.type || 'SCI'}
                    className={styles.select}
                >
                    <option value="SCI">SCI</option>
                    <option value="LMNP">LMNP / LMP</option>
                    <option value="INDIVISION">Indivision</option>
                    <option value="NOM_PROPRE">En nom propre</option>
                    <option value="AUTRE">Autre</option>
                </select>
            </div>

            <div className={styles.formGroup}>
                <label htmlFor="siret" className={styles.label}>Numéro SIRET</label>
                <input
                    type="text"
                    id="siret"
                    name="siret"
                    defaultValue={company?.siret || ''}
                    className={styles.input}
                    placeholder="Ex: 123 456 789 00012"
                />
            </div>

            <div className={styles.formGroup}>
                <label htmlFor="address" className={styles.label}>Adresse du siège</label>
                <textarea
                    id="address"
                    name="address"
                    defaultValue={company?.address || ''}
                    className={styles.textarea}
                    placeholder="Ex: 10 rue de la Paix, 75000 Paris"
                    rows={3}
                />
            </div>

            <div className={styles.buttonGroup}>
                <a href={isEdit ? `/companies/${company.id}` : '/companies'} className={styles.cancelButton}>
                    Annuler
                </a>
                <button type="submit" disabled={loading} className={styles.submitButton}>
                    {loading ? 'Enregistrement...' : (isEdit ? 'Mettre à jour' : 'Créer la société')}
                </button>
            </div>
        </form>
    );
}
