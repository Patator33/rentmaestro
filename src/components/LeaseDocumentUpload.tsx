'use client';

import { useState, useRef, useCallback } from 'react';
import { uploadLeaseDocument, deleteLeaseDocument } from '@/actions/documents';

const BASE_DOC_TYPES = [
    { value: 'BAIL', label: '📝 Bail' },
    { value: 'EDL', label: '🔑 État des lieux' },
    { value: 'CAUTIONNEMENT', label: '🤝 Acte de cautionnement' },
    { value: 'AUTRE', label: '📄 Autre' },
] as const;

type DocTypeValue = 'BAIL' | 'EDL' | 'CAUTIONNEMENT' | 'AUTRE';

interface Doc {
    id: string;
    name: string;
    url: string;
    size: number;
    docType: string;
    createdAt: Date;
}

interface Props {
    leaseId: string;
    initialDocuments: Doc[];
    guarantorType?: string | null;
}

export default function LeaseDocumentUpload({ leaseId, initialDocuments, guarantorType }: Props) {
    const DOC_TYPES = BASE_DOC_TYPES.filter(dt =>
        dt.value !== 'CAUTIONNEMENT' || guarantorType === 'PRIVATE'
    );
    const [docs, setDocs] = useState<Doc[]>(initialDocuments);
    const [uploading, setUploading] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [docType, setDocType] = useState<DocTypeValue>('BAIL');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFiles = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setUploading(true);
        try {
            for (const file of Array.from(files)) {
                const fd = new FormData();
                fd.append('file', file);
                fd.append('leaseId', leaseId);
                fd.append('docType', docType);
                await uploadLeaseDocument(fd);
            }
            window.location.reload();
        } catch (e) {
            alert('Erreur lors du téléversement');
        } finally {
            setUploading(false);
        }
    }, [leaseId, docType]);

    const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
    const onDragLeave = () => setDragging(false);
    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Supprimer ce document ?')) return;
        await deleteLeaseDocument(id, leaseId);
        setDocs(docs.filter(d => d.id !== id));
    };

    const getDocTypeLabel = (dt: string) => BASE_DOC_TYPES.find(d => d.value === dt)?.label ?? '📄 Autre';

    return (
        <div>
            {/* Type selector */}
            <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    Type de fichier :
                </label>
                <select
                    value={docType}
                    onChange={e => setDocType(e.target.value as DocTypeValue)}
                    style={{
                        padding: '0.35rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--surface)',
                        color: 'var(--text-main)',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                    }}
                >
                    {DOC_TYPES.map(dt => (
                        <option key={dt.value} value={dt.value}>{dt.label}</option>
                    ))}
                </select>
            </div>

            {/* Drop zone */}
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
                        <p style={{ fontSize: '1.4rem', marginBottom: '0.4rem' }}>📎</p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Glissez-déposez un fichier ici, ou <strong>cliquez pour choisir</strong>
                        </p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                            Sera enregistré comme : {getDocTypeLabel(docType)}
                        </p>
                    </>
                )}
            </div>

            {docs.length > 0 && (
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {docs.map(doc => (
                        <li key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 1rem', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                                <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    padding: '0.15rem 0.45rem',
                                    borderRadius: '4px',
                                    whiteSpace: 'nowrap',
                                    background: doc.docType === 'BAIL' ? 'rgba(163,230,53,0.12)' : doc.docType === 'EDL' ? 'rgba(34,197,94,0.12)' : doc.docType === 'CAUTIONNEMENT' ? 'rgba(103,232,249,0.12)' : 'rgba(100,116,139,0.12)',
                                    color: doc.docType === 'BAIL' ? 'var(--primary-color)' : doc.docType === 'EDL' ? '#22c55e' : doc.docType === 'CAUTIONNEMENT' ? 'var(--accent-color)' : 'var(--text-muted)',
                                }}>
                                    {doc.docType === 'BAIL' ? 'Bail' : doc.docType === 'EDL' ? 'EDL' : doc.docType === 'CAUTIONNEMENT' ? 'Caution' : 'Autre'}
                                </span>
                                <a href={encodeURI(doc.url)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', fontWeight: 500, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {doc.name}
                                </a>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
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
