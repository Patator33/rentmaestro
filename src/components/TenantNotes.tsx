'use client';

import { useRef } from 'react';
import { addTenantNote, deleteTenantNote } from '@/actions/management';
import { useToast } from './Toast';

const TYPE_LABELS: Record<string, { label: string; icon: string }> = {
    NOTE: { label: 'Note', icon: '📝' },
    CALL: { label: 'Appel', icon: '📞' },
    EMAIL: { label: 'Email', icon: '📧' },
    LETTER: { label: 'Courrier', icon: '✉️' },
    REMINDER: { label: 'Relance', icon: '⚠️' },
};

interface Note {
    id: string;
    content: string;
    type: string;
    createdAt: Date;
}

interface TenantNotesProps {
    tenantId: string;
    notes: Note[];
}

export default function TenantNotes({ tenantId, notes }: TenantNotesProps) {
    const formRef = useRef<HTMLFormElement>(null);
    const { addToast } = useToast();

    const handleSubmit = async (formData: FormData) => {
        try {
            await addTenantNote(formData);
            formRef.current?.reset();
            addToast('Note ajoutée', 'success');
        } catch {
            addToast('Erreur lors de l\'ajout', 'error');
        }
    };

    const handleDelete = async (noteId: string) => {
        try {
            await deleteTenantNote(noteId);
            addToast('Note supprimée', 'info');
        } catch {
            addToast('Erreur lors de la suppression', 'error');
        }
    };

    return (
        <section style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem' }}>
                📋 Journal des échanges
            </h2>

            <form ref={formRef} action={handleSubmit} style={{
                display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap',
            }}>
                <input type="hidden" name="tenantId" value={tenantId} />
                <select name="type" defaultValue="NOTE" style={{
                    padding: '0.5rem', background: 'var(--surface)', border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontFamily: 'inherit',
                }}>
                    {Object.entries(TYPE_LABELS).map(([key, val]) => (
                        <option key={key} value={key}>{val.icon} {val.label}</option>
                    ))}
                </select>
                <input
                    name="content"
                    placeholder="Ajouter une note..."
                    required
                    style={{
                        flex: 1, minWidth: '200px', padding: '0.5rem 0.75rem',
                        background: 'var(--surface)', border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontFamily: 'inherit',
                    }}
                />
                <button type="submit" className="std-add-button" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                    + Ajouter
                </button>
            </form>

            {notes.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                    Aucun échange enregistré.
                </p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {notes.map(note => {
                        const typeMeta = TYPE_LABELS[note.type] || TYPE_LABELS.NOTE;
                        return (
                            <div key={note.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '0.75rem 1rem', background: 'var(--surface)',
                                border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                            }}>
                                <div style={{ flex: 1 }}>
                                    <span style={{ fontSize: '0.8rem', marginRight: '0.5rem' }}>{typeMeta.icon}</span>
                                    <span style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>{note.content}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.75rem' }}>
                                        {new Date(note.createdAt).toLocaleDateString('fr-FR', {
                                            day: '2-digit', month: 'short', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit',
                                        })}
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleDelete(note.id)}
                                    style={{
                                        background: 'transparent', border: 'none', cursor: 'pointer',
                                        color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0.25rem',
                                    }}
                                    title="Supprimer"
                                >
                                    🗑️
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
