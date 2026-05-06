'use client';

import { useState, useRef, useCallback } from 'react';
import { uploadCompanyDocument, deleteCompanyDocument } from '@/actions/documents';

const DOC_TYPES = [
    { value: 'RIB', label: '🏦 RIB' },
    { value: 'STATUTS', label: '📜 Statuts' },
    { value: 'KBIS', label: '🏢 K-bis' },
    { value: 'AUTRE', label: '📄 Autre' },
];

interface Doc {
    id: string;
    name: string;
    url: string;
    size: number;
    docType: string;
    createdAt: Date;
}

interface Props {
    companyId: string;
    initialDocuments: Doc[];
}

export default function CompanyDocumentUpload({ companyId, initialDocuments }: Props) {
    const [docs, setDocs] = useState<Doc[]>(initialDocuments);
    const [uploading, setUploading] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [selectedDocType, setSelectedDocType] = useState('RIB');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFiles = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setUploading(true);
        try {
            for (const file of Array.from(files)) {
                const fd = new FormData();
                fd.append('file', file);
                fd.append('companyId', companyId);
                fd.append('docType', selectedDocType);
                await uploadCompanyDocument(fd);
            }
            window.location.reload();
        } catch {
            alert('Erreur lors du téléversement');
        } finally {
            setUploading(false);
        }
    }, [companyId, selectedDocType]);

    const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
    const onDragLeave = () => setDragging(false);
    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Supprimer ce document ?')) return;
        await deleteCompanyDocument(id, companyId);
        setDocs(docs.filter(d => d.id !== id));
    };

    const docTypeLabel = (dt: string) => DOC_TYPES.find(t => t.value === dt)?.label ?? dt;

    return (
        <div>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Type :</label>
                {DOC_TYPES.map(t => (
                    <button
                        key={t.value}
                        onClick={() => setSelectedDocType(t.value)}
                        style={{
                            padding: '0.3rem 0.75rem',
                            borderRadius: '20px',
                            border: `1px solid ${selectedDocType === t.value ? 'var(--primary-color)' : 'var(--border-color)'}`,
                            background: selectedDocType === t.value ? 'rgba(43,140,238,0.12)' : 'var(--surface)',
                            color: selectedDocType === t.value ? 'var(--primary-color)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: selectedDocType === t.value ? 600 : 400,
                        }}
                    >{t.label}</button>
                ))}
            </div>

            <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                    border: `2px dashed ${dragging ? 'var(--primary-color)' : 'var(--border-color)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '2rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: dragging ? 'rgba(43,140,238,0.06)' : 'var(--surface)',
                    transition: 'all 0.2s',
                    marginBottom: '1rem',
                }}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    onChange={e => handleFiles(e.target.files)}
                />
                {uploading ? (
                    <p style={{ color: 'var(--primary-color)' }}>Téléversement en cours…</p>
                ) : (
                    <>
                        <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📎</p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Glissez-déposez un fichier ici, ou <strong>cliquez pour choisir</strong>
                        </p>
                    </>
                )}
            </div>

            {docs.length > 0 && (
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {docs.map(doc => (
                        <li key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 1rem', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                                <a href={encodeURI(doc.url)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', fontWeight: 500, fontSize: '0.9rem' }}>
                                    {docTypeLabel(doc.docType)} — {doc.name}
                                </a>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{(doc.size / 1024).toFixed(1)} Ko</span>
                                <button
                                    onClick={() => handleDelete(doc.id)}
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--error)', fontSize: '1rem' }}
                                    title="Supprimer"
                                >🗑️</button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
