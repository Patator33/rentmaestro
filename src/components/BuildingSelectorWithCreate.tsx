'use client';

import { useState } from 'react';
import { createBuildingQuick } from '@/actions/buildings';
import { useRouter } from 'next/navigation';

interface Building { id: string; name: string; address: string; }
interface Company { id: string; name: string; type: string; }

interface Props {
    buildings: Building[];
    companies: Company[];
    defaultValue?: string | null;
    inputClassName?: string;
}

export default function BuildingSelectorWithCreate({ buildings: initial, companies, defaultValue, inputClassName }: Props) {
    const [buildings, setBuildings] = useState(initial);
    const [selected, setSelected] = useState(defaultValue || '');
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newAddress, setNewAddress] = useState('');
    const [newCompanyId, setNewCompanyId] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleCreate = async () => {
        if (!newName.trim() || !newAddress.trim()) return;
        setCreating(true);
        setError('');
        try {
            const fd = new FormData();
            fd.append('name', newName.trim());
            fd.append('address', newAddress.trim());
            if (newCompanyId) fd.append('companyId', newCompanyId);
            const building = await createBuildingQuick(fd);
            setBuildings(prev => [...prev, building]);
            setSelected(building.id);
            setShowCreate(false);
            setNewName(''); setNewAddress(''); setNewCompanyId('');
            router.refresh();
        } catch {
            setError('Erreur lors de la création');
        } finally {
            setCreating(false);
        }
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '0.65rem 0.9rem',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        background: 'var(--surface-active)',
        color: 'var(--text-main)',
        fontSize: '0.95rem',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
    };

    return (
        <div>
            <input type="hidden" name="buildingId" value={selected} />

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select
                    value={selected}
                    onChange={e => setSelected(e.target.value)}
                    className={inputClassName}
                    style={inputClassName ? undefined : { ...inputStyle, flex: 1 }}
                >
                    <option value="">Aucun immeuble</option>
                    {buildings.map(b => (
                        <option key={b.id} value={b.id}>{b.name} — {b.address}</option>
                    ))}
                </select>
                <button
                    type="button"
                    onClick={() => { setShowCreate(!showCreate); setError(''); }}
                    title={showCreate ? 'Annuler' : 'Créer un immeuble'}
                    style={{ padding: '0.5rem 0.75rem', background: showCreate ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.1)', border: `1px solid ${showCreate ? 'rgba(239,68,68,0.4)' : 'rgba(99,102,241,0.4)'}`, borderRadius: '8px', color: showCreate ? '#ef4444' : '#6366f1', cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'inherit', flexShrink: 0 }}
                >
                    {showCreate ? '✕' : '➕'}
                </button>
            </div>

            {showCreate && (
                <div style={{ marginTop: '0.75rem', padding: '1rem', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '10px' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6366f1', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🏗️ Nouvel immeuble</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <input
                            type="text"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder="Nom de l'immeuble *"
                            required
                            style={inputStyle}
                        />
                        <input
                            type="text"
                            value={newAddress}
                            onChange={e => setNewAddress(e.target.value)}
                            placeholder="Adresse *"
                            required
                            style={inputStyle}
                        />
                        <select
                            value={newCompanyId}
                            onChange={e => setNewCompanyId(e.target.value)}
                            style={inputStyle}
                        >
                            <option value="">En nom propre</option>
                            {companies.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                            ))}
                        </select>
                        {error && <p style={{ fontSize: '0.8rem', color: '#ef4444' }}>{error}</p>}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                type="button"
                                onClick={handleCreate}
                                disabled={creating || !newName.trim() || !newAddress.trim()}
                                style={{ flex: 1, padding: '0.5rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', fontFamily: 'inherit', opacity: creating ? 0.7 : 1 }}
                            >
                                {creating ? 'Création...' : 'Créer l\'immeuble'}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setShowCreate(false); setNewName(''); setNewAddress(''); setNewCompanyId(''); setError(''); }}
                                style={{ padding: '0.5rem 0.75rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit' }}
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
