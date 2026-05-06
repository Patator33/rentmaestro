'use client';

import { useRef, useState } from 'react';

export default function BackupRestore() {
    const [restoreFile, setRestoreFile] = useState<File | null>(null);
    const [restoreMsg, setRestoreMsg] = useState('');
    const [restoreLoading, setRestoreLoading] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleRestore = async () => {
        if (!restoreFile) return;
        setRestoreLoading(true);
        setRestoreMsg('');
        try {
            const fd = new FormData();
            fd.append('file', restoreFile);
            const res = await fetch('/api/backup', { method: 'POST', body: fd });
            const data = await res.json();
            if (res.ok) {
                setRestoreMsg('✓ ' + data.message);
                setRestoreFile(null);
                setConfirmed(false);
                if (fileRef.current) fileRef.current.value = '';
            } else {
                setRestoreMsg('✗ ' + (data.error ?? 'Erreur inconnue'));
            }
        } catch {
            setRestoreMsg('✗ Erreur réseau');
        } finally {
            setRestoreLoading(false);
        }
    };

    return (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>💾 Sauvegarde & Restauration</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Exportez la base de données ou restaurez une sauvegarde préalablement téléchargée.
            </p>

            {/* Download */}
            <div style={{ marginBottom: '1.25rem' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Télécharger une sauvegarde</p>
                <a
                    href="/api/backup"
                    download
                    style={{ display: 'inline-block', padding: '0.5rem 1rem', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: 'var(--radius-sm)', color: '#22c55e', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}
                >
                    ⬇ Télécharger rentmaestro.db
                </a>
            </div>

            {/* Restore */}
            <div>
                <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Restaurer une sauvegarde</p>
                <p style={{ fontSize: '0.8rem', color: '#f59e0b', marginBottom: '0.75rem' }}>
                    ⚠ Cette action remplace intégralement la base de données actuelle. Téléchargez une sauvegarde avant de procéder.
                </p>

                <input
                    ref={fileRef}
                    type="file"
                    accept=".db"
                    onChange={e => { setRestoreFile(e.target.files?.[0] ?? null); setRestoreMsg(''); setConfirmed(false); }}
                    style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '0.5rem', display: 'block' }}
                />

                {restoreFile && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={confirmed}
                            onChange={e => setConfirmed(e.target.checked)}
                        />
                        Je confirme vouloir écraser la base de données avec <strong>{restoreFile.name}</strong>
                    </label>
                )}

                <button
                    onClick={handleRestore}
                    disabled={!restoreFile || !confirmed || restoreLoading}
                    style={{ padding: '0.5rem 1rem', background: confirmed && restoreFile ? 'rgba(239,68,68,0.15)' : 'var(--surface)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 'var(--radius-sm)', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600, cursor: confirmed && restoreFile ? 'pointer' : 'not-allowed', opacity: (!restoreFile || !confirmed || restoreLoading) ? 0.5 : 1 }}
                >
                    {restoreLoading ? 'Restauration...' : '⬆ Restaurer'}
                </button>

                {restoreMsg && (
                    <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: restoreMsg.startsWith('✓') ? '#22c55e' : '#ef4444' }}>
                        {restoreMsg}
                    </p>
                )}
            </div>
        </div>
    );
}
