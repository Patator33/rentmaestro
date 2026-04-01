'use client';

import { useState, useRef } from 'react';
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
    const [logoUrl, setLogoUrl] = useState<string | null>((company as any)?.logoUrl ?? null);
    const [logoUploading, setLogoUploading] = useState(false);
    const [dragging, setDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const uploadLogo = async (file: File) => {
        setLogoUploading(true);
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload/company-logo', { method: 'POST', body: fd });
        setLogoUploading(false);
        if (res.ok) {
            const data = await res.json();
            setLogoUrl(data.url);
        } else {
            alert('Erreur lors du téléversement du logo');
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) await uploadLogo(file);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) await uploadLogo(file);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        if (logoUrl) formData.set('logoUrl', logoUrl);

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

            {/* Logo Upload */}
            <div className={styles.formGroup}>
                <label className={styles.label}>Logo (affiché sur les quittances)</label>
                <div
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        border: `2px dashed ${dragging ? '#2b8cee' : '#cbd5e1'}`,
                        borderRadius: '8px',
                        padding: '1.5rem',
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: dragging ? 'rgba(43,140,238,0.05)' : 'transparent',
                        transition: 'all 0.2s',
                    }}
                >
                    {logoUploading ? (
                        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>⏳ Téléversement...</p>
                    ) : logoUrl ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <img src={logoUrl} alt="Logo" style={{ maxHeight: '60px', maxWidth: '200px', objectFit: 'contain' }} />
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Cliquer ou déposer pour remplacer</span>
                            <button
                                type="button"
                                onClick={e => { e.stopPropagation(); setLogoUrl(null); }}
                                style={{ fontSize: '0.8rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                                Supprimer le logo
                            </button>
                        </div>
                    ) : (
                        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                            🖼️ Glisser-déposer ou cliquer pour téléverser un logo
                        </p>
                    )}
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
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
