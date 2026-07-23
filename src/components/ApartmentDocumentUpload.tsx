'use client';

import { useState, useRef, useCallback } from 'react';
import { uploadApartmentDocument, deleteApartmentDocument } from '@/actions/documents';

const DOC_TYPES = [
    { value: 'BAIL_TYPE', label: '📝 Bail type', highlight: true },
    { value: 'ETAT_DES_LIEUX', label: '🏠 État des lieux', highlight: true },
    { value: 'DIAGNOSTIC', label: '🔍 Diagnostic' },
    { value: 'ASSURANCE', label: '🛡️ Assurance' },
    { value: 'AUTRE', label: '📎 Autre' },
];

interface Doc {
    id: string;
    name: string;
    url: string;
    size: number;
    docType?: string;
    createdAt: Date;
}

interface Props {
    apartmentId: string;
    initialDocuments: Doc[];
}

export default function ApartmentDocumentUpload({ apartmentId, initialDocuments }: Props) {
    const [docs, setDocs] = useState<Doc[]>(initialDocuments);
    const [uploading, setUploading] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [selectedDocType, setSelectedDocType] = useState('AUTRE');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFiles = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setUploading(true);
        try {
            for (const file of Array.from(files)) {
                const fd = new FormData();
                fd.append('file', file);
                fd.append('apartmentId', apartmentId);
                fd.append('docType', selectedDocType);
                await uploadApartmentDocument(fd);
            }
            window.location.reload();
        } catch {
            alert('Erreur lors du téléversement');
        } finally {
            setUploading(false);
        }
    }, [apartmentId, selectedDocType]);

    const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
    const onDragLeave = () => setDragging(false);
    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Supprimer ce document ?')) return;
        await deleteApartmentDocument(id, apartmentId);
        setDocs(docs.filter(d => d.id !== id));
    };

    const getDocTypeLabel = (dt?: string) => DOC_TYPES.find(t => t.value === dt)?.label ?? '📎 Autre';

    return (
        <div>
            {/* Type selector */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                {DOC_TYPES.map(t => (
                    <button
                        key={t.value}
                        type="button"
                        onClick={() => setSelectedDocType(t.value)}
                        style={{
                            padding: '0.3rem 0.75rem',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            fontWeight: selectedDocType === t.value ? 700 : 400,
                            cursor: 'pointer',
                            border: `1px solid ${selectedDocType === t.value ? 'var(--primary-color)' : 'var(--border-color)'}`,
                            background: selectedDocType === t.value ? 'rgba(43,140,238,0.12)' : 'var(--surface)',
                            color: selectedDocType === t.value ? 'var(--primary-color)' : 'var(--text-secondary)',
                            outline: t.highlight && selectedDocType !== t.value ? '1px dashed var(--border-color)' : 'none',
                        }}
                    >
                        {t.label}
                    </button>
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
                    padding: '1.5rem',
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
                        <p style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📎</p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            Glissez-déposez ou <strong>cliquez</strong> — type : <strong>{DOC_TYPES.find(t => t.value === selectedDocType)?.label}</strong>
                        </p>
                    </>
                )}
            </div>

            {docs.length > 0 && (
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {docs.map(doc => (
                        <li key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 1rem', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', gap: '0.75rem' }}>
                            <a href={encodeURI(doc.url.replace('/uploads/', '/api/documents/'))} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', fontWeight: 500, fontSize: '0.9rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                📄 {doc.name}
                            </a>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                                {doc.docType && doc.docType !== 'AUTRE' && (
                                    <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '10px', background: 'rgba(43,140,238,0.1)', color: 'var(--primary-color)', border: '1px solid rgba(43,140,238,0.2)', fontWeight: 600 }}>
                                        {getDocTypeLabel(doc.docType)}
                                    </span>
                                )}
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
