'use client';

import { useState, useEffect, useCallback } from 'react';

interface User {
    id: string;
    email: string;
    totpEnabled: boolean;
    createdAt: string;
}

export default function UserManagement({ currentUserId }: { currentUserId: string }) {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/users');
            if (res.ok) setUsers(await res.json());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadUsers(); }, [loadUsers]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
        if (password.length < 8) { setError('Le mot de passe doit faire au moins 8 caractères.'); return; }
        setSubmitting(true);
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Erreur lors de la création.'); return; }
            setSuccess(`Utilisateur ${data.email} créé avec succès.`);
            setEmail(''); setPassword(''); setConfirm('');
            setShowForm(false);
            loadUsers();
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string, userEmail: string) => {
        if (!confirm(`Supprimer l'utilisateur ${userEmail} ?`)) return;
        const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) { setError(data.error); return; }
        setSuccess(`Utilisateur ${userEmail} supprimé.`);
        loadUsers();
    };

    const handleResetTotp = async (id: string, userEmail: string) => {
        if (!confirm(`Désactiver le TOTP pour ${userEmail} ?`)) return;
        const res = await fetch(`/api/users/${id}/reset-totp`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) { setError(data.error); return; }
        setSuccess(`TOTP désactivé pour ${userEmail}.`);
        loadUsers();
    };

    const cardStyle: React.CSSProperties = {
        background: 'var(--surface)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        marginTop: '2rem',
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '0.65rem 0.75rem',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--background)',
        color: 'var(--text-main)',
        fontSize: '0.95rem',
        boxSizing: 'border-box',
    };

    return (
        <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>👥 Utilisateurs</h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Gérez les comptes ayant accès à Rentmaestro
                    </p>
                </div>
                <button
                    onClick={() => { setShowForm(!showForm); setError(''); setSuccess(''); }}
                    className="std-add-button"
                    style={{ fontSize: '0.85rem' }}
                >
                    {showForm ? '✕ Annuler' : '+ Nouveau'}
                </button>
            </div>

            {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--error)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                    {error}
                </div>
            )}
            {success && (
                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: 'var(--success)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                    {success}
                </div>
            )}

            {showForm && (
                <form onSubmit={handleCreate} style={{ background: 'var(--background)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>Créer un utilisateur</h3>
                    <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>Email *</label>
                        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} placeholder="prenom.nom@exemple.com" />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>Mot de passe * (min. 8 caractères)</label>
                        <input type="password" required value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} placeholder="••••••••" />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>Confirmer le mot de passe *</label>
                        <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)} style={inputStyle} placeholder="••••••••" />
                    </div>
                    <button type="submit" disabled={submitting} style={{ background: 'var(--primary-color)', color: 'white', border: 'none', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}>
                        {submitting ? 'Création...' : 'Créer le compte'}
                    </button>
                </form>
            )}

            {loading ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Chargement...</p>
            ) : (
                <div className="table-container" style={{ margin: 0 }}>
                    <table className="std-table">
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th>TOTP</th>
                                <th>Créé le</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td style={{ fontWeight: 500 }}>
                                        {user.email}
                                        {user.id === currentUserId && (
                                            <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', background: 'rgba(43,140,238,0.15)', color: 'var(--primary-color)', padding: '0.1rem 0.4rem', borderRadius: '9999px' }}>vous</span>
                                        )}
                                    </td>
                                    <td>
                                        {user.totpEnabled ? (
                                            <span style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>✓ Activé</span>
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Non activé</span>
                                        )}
                                    </td>
                                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            {user.totpEnabled && user.id !== currentUserId && (
                                                <button
                                                    onClick={() => handleResetTotp(user.id, user.email)}
                                                    style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'transparent', color: 'var(--warning)', cursor: 'pointer' }}
                                                    title="Désactiver le TOTP"
                                                >
                                                    🔑 Reset TOTP
                                                </button>
                                            )}
                                            {user.id !== currentUserId && (
                                                <button
                                                    onClick={() => handleDelete(user.id, user.email)}
                                                    style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.08)', color: 'var(--error)', cursor: 'pointer' }}
                                                >
                                                    Supprimer
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
