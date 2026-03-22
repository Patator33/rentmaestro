'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { uploadInspection, deleteInspection } from '@/actions/inspections';

interface Inspection {
    id: string;
    leaseId: string;
    type: string;
    date: Date;
    notes: string | null;
    fileUrl: string | null;
    fileName: string | null;
    createdAt: Date;
}

interface Lease {
    id: string;
    tenantFirstName: string;
    tenantLastName: string;
    startDate: Date;
    inspections: Inspection[];
}

interface Props {
    apartmentId: string;
    leases: Lease[];
}

export default function InspectionBoard({ apartmentId, leases }: Props) {
    const router = useRouter();
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);

    const allInspections = leases.flatMap(l =>
        l.inspections.map(i => ({ ...i, lease: l }))
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        formData.set('apartmentId', apartmentId);
        const res = await uploadInspection(formData);
        if (res.success) {
            setShowForm(false);
            router.refresh();
        } else {
            alert("Erreur lors de l'enregistrement de l'état des lieux.");
        }
        setLoading(false);
    };

    const handleDelete = async (inspectionId: string) => {
        if (!confirm("Supprimer cet état des lieux ?")) return;
        const res = await deleteInspection(inspectionId, apartmentId);
        if (res.success) {
            router.refresh();
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-color)', margin: 0 }}>
                    📋 États des lieux ({allInspections.length})
                </h2>
                {leases.length > 0 && (
                    <button
                        onClick={() => setShowForm(!showForm)}
                        style={{ background: '#2b8cee', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}
                    >
                        {showForm ? '✕ Annuler' : '+ Nouvel état des lieux'}
                    </button>
                )}
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--text-main)' }}>Nouvel état des lieux</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Bail *</label>
                            <select name="leaseId" required style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '6px', fontFamily: 'inherit', fontSize: '0.9rem', background: 'var(--surface-active)', color: 'var(--text-main)' }}>
                                {leases.map(l => (
                                    <option key={l.id} value={l.id}>
                                        {l.tenantFirstName} {l.tenantLastName}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Type *</label>
                            <select name="type" required style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '6px', fontFamily: 'inherit', fontSize: '0.9rem', background: 'var(--surface-active)', color: 'var(--text-main)' }}>
                                <option value="ENTRY">Entrée</option>
                                <option value="EXIT">Sortie</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Date *</label>
                            <input
                                type="date"
                                name="date"
                                defaultValue={new Date().toISOString().split('T')[0]}
                                required
                                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '6px', fontFamily: 'inherit', fontSize: '0.9rem', background: 'var(--surface-active)', color: 'var(--text-main)' }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Fichier (PDF, image…)</label>
                        <input
                            type="file"
                            name="file"
                            accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
                            style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.9rem', fontFamily: 'inherit', background: 'var(--surface-active)', color: 'var(--text-main)' }}
                        />
                    </div>

                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Observations</label>
                        <textarea
                            name="notes"
                            rows={2}
                            placeholder="Compteurs, clés remises, remarques..."
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '6px', fontFamily: 'inherit', fontSize: '0.9rem', resize: 'vertical', background: 'var(--surface-active)', color: 'var(--text-main)' }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{ background: '#2b8cee', color: 'white', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
                    >
                        {loading ? 'Enregistrement...' : '✓ Enregistrer'}
                    </button>
                </form>
            )}

            {allInspections.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                    Aucun état des lieux enregistré.
                    {leases.length === 0 && ' Créez d\'abord un bail pour cet appartement.'}
                </p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {allInspections.map(insp => {
                        const isEntry = insp.type === 'ENTRY';
                        return (
                            <div key={insp.id} style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.9rem 1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', background: isEntry ? 'rgba(43,140,238,0.04)' : 'rgba(232,121,168,0.04)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
                                    <span style={{ fontSize: '1.2rem' }}>{isEntry ? '📥' : '📤'}</span>
                                    <div>
                                        <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                                            État des lieux de {isEntry ? 'entrée' : 'sortie'}
                                        </span>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginLeft: '0.75rem' }}>
                                            {new Date(insp.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--surface-active)', padding: '0.2rem 0.6rem', borderRadius: '9999px' }}>
                                        {insp.lease.tenantFirstName} {insp.lease.tenantLastName}
                                    </span>
                                    {insp.notes && (
                                        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{insp.notes}</span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                                    {insp.fileUrl && (
                                        <a
                                            href={insp.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title={insp.fileName ?? undefined}
                                            style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem', background: 'var(--surface-active)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}
                                        >
                                            📄 {insp.fileName ?? 'Fichier'}
                                        </a>
                                    )}
                                    <button
                                        onClick={() => handleDelete(insp.id)}
                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', opacity: 0.6, padding: '0.2rem 0.3rem' }}
                                        title="Supprimer"
                                    >×</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
