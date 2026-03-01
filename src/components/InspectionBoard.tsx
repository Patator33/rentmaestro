'use client';

import { useState } from 'react';
import { createInspection, deleteInspection } from '@/actions/inspections';

interface Room {
    name: string;
    condition: 'BON' | 'MOYEN' | 'MAUVAIS';
    notes: string;
}

interface Inspection {
    id: string;
    leaseId: string;
    type: string;
    date: Date;
    rooms: string;
    notes: string | null;
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

const DEFAULT_ROOMS: Room[] = [
    { name: 'Entrée / Couloir', condition: 'BON', notes: '' },
    { name: 'Salon', condition: 'BON', notes: '' },
    { name: 'Cuisine', condition: 'BON', notes: '' },
    { name: 'Chambre', condition: 'BON', notes: '' },
    { name: 'Salle de bain', condition: 'BON', notes: '' },
    { name: 'WC', condition: 'BON', notes: '' },
];

const CONDITION_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    BON: { label: 'Bon état', color: '#16a34a', bg: '#f0fdf4' },
    MOYEN: { label: 'État moyen', color: '#d97706', bg: '#fffbeb' },
    MAUVAIS: { label: 'Mauvais état', color: '#dc2626', bg: '#fef2f2' },
};

export default function InspectionBoard({ apartmentId, leases }: Props) {
    const [showForm, setShowForm] = useState(false);
    const [selectedLeaseId, setSelectedLeaseId] = useState(leases[0]?.id ?? '');
    const [type, setType] = useState<'ENTRY' | 'EXIT'>('ENTRY');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [rooms, setRooms] = useState<Room[]>(DEFAULT_ROOMS);
    const [globalNotes, setGlobalNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [allLeases, setAllLeases] = useState<Lease[]>(leases);

    const activeLeases = allLeases.filter(l => l.inspections !== undefined);

    const addRoom = () => setRooms(r => [...r, { name: '', condition: 'BON', notes: '' }]);
    const removeRoom = (i: number) => setRooms(r => r.filter((_, idx) => idx !== i));
    const updateRoom = (i: number, field: keyof Room, value: string) =>
        setRooms(r => r.map((room, idx) => idx === i ? { ...room, [field]: value } : room));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLeaseId || rooms.some(r => !r.name.trim())) {
            alert('Veuillez renseigner tous les noms de pièces.');
            return;
        }
        setLoading(true);
        const res = await createInspection({
            leaseId: selectedLeaseId,
            apartmentId,
            type,
            date,
            rooms: rooms.map(r => ({ name: r.name.trim(), condition: r.condition, notes: r.notes.trim() })),
            notes: globalNotes || undefined,
        });
        if (res.success) {
            // Add inspection to local state
            setAllLeases(prev => prev.map(l => {
                if (l.id !== selectedLeaseId) return l;
                return { ...l, inspections: [res.inspection, ...l.inspections] };
            }));
            setShowForm(false);
            setRooms(DEFAULT_ROOMS);
            setGlobalNotes('');
        } else {
            alert("Erreur lors de la création de l'état des lieux.");
        }
        setLoading(false);
    };

    const handleDelete = async (inspectionId: string, leaseId: string) => {
        if (!confirm("Supprimer cet état des lieux ?")) return;
        const res = await deleteInspection(inspectionId, apartmentId);
        if (res.success) {
            setAllLeases(prev => prev.map(l => {
                if (l.id !== leaseId) return l;
                return { ...l, inspections: l.inspections.filter(i => i.id !== inspectionId) };
            }));
        }
    };

    const allInspections = allLeases.flatMap(l =>
        l.inspections.map(i => ({ ...i, lease: l }))
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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

            {/* Creation form */}
            {showForm && (
                <form onSubmit={handleSubmit} style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--text-main)' }}>Nouveau état des lieux</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Bail</label>
                            <select
                                value={selectedLeaseId}
                                onChange={e => setSelectedLeaseId(e.target.value)}
                                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '6px', fontFamily: 'inherit', fontSize: '0.9rem', background: 'var(--surface-active)', color: 'var(--text-main)' }}
                            >
                                {leases.map(l => (
                                    <option key={l.id} value={l.id}>
                                        {l.tenantFirstName} {l.tenantLastName}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Type</label>
                            <select
                                value={type}
                                onChange={e => setType(e.target.value as 'ENTRY' | 'EXIT')}
                                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '6px', fontFamily: 'inherit', fontSize: '0.9rem', background: 'var(--surface-active)', color: 'var(--text-main)' }}
                            >
                                <option value="ENTRY">Entrée</option>
                                <option value="EXIT">Sortie</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                required
                                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '6px', fontFamily: 'inherit', fontSize: '0.9rem', background: 'var(--surface-active)', color: 'var(--text-main)' }}
                            />
                        </div>
                    </div>

                    {/* Rooms */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Pièces</label>
                            <button type="button" onClick={addRoom} style={{ fontSize: '0.8rem', background: 'none', border: '1px solid var(--border-color)', padding: '0.25rem 0.7rem', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                + Ajouter une pièce
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {rooms.map((room, i) => (
                                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        value={room.name}
                                        onChange={e => updateRoom(i, 'name', e.target.value)}
                                        placeholder="Nom de la pièce"
                                        required
                                        style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.85rem', fontFamily: 'inherit', background: 'var(--surface-active)', color: 'var(--text-main)' }}
                                    />
                                    <select
                                        value={room.condition}
                                        onChange={e => updateRoom(i, 'condition', e.target.value)}
                                        style={{ padding: '0.4rem 0.5rem', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.85rem', fontFamily: 'inherit', color: CONDITION_LABELS[room.condition].color, fontWeight: 600, background: 'var(--surface-active)' }}
                                    >
                                        <option value="BON">Bon état</option>
                                        <option value="MOYEN">État moyen</option>
                                        <option value="MAUVAIS">Mauvais état</option>
                                    </select>
                                    <input
                                        type="text"
                                        value={room.notes}
                                        onChange={e => updateRoom(i, 'notes', e.target.value)}
                                        placeholder="Observations (optionnel)"
                                        style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.85rem', fontFamily: 'inherit', background: 'var(--surface-active)', color: 'var(--text-main)' }}
                                    />
                                    <button type="button" onClick={() => removeRoom(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: '0 0.25rem' }}>×</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Observations générales</label>
                        <textarea
                            value={globalNotes}
                            onChange={e => setGlobalNotes(e.target.value)}
                            rows={2}
                            placeholder="Compteurs, clés remises, remarques..."
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '6px', fontFamily: 'inherit', fontSize: '0.9rem', resize: 'vertical', background: 'var(--surface-active)', color: 'var(--text-main)' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{ background: '#2b8cee', color: 'white', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
                        >
                            {loading ? 'Enregistrement...' : '✓ Enregistrer l\'état des lieux'}
                        </button>
                        <a
                            href="#"
                            onClick={e => { e.preventDefault(); setShowForm(false); }}
                            style={{ padding: '0.6rem 1rem', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}
                        >
                            Annuler
                        </a>
                    </div>
                </form>
            )}

            {/* List */}
            {allInspections.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                    Aucun état des lieux enregistré.
                    {leases.length === 0 && ' Créez d\'abord un bail pour cet appartement.'}
                </p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {allInspections.map(insp => {
                        const rooms: Room[] = JSON.parse(insp.rooms || '[]');
                        const isEntry = insp.type === 'ENTRY';
                        return (
                            <div key={insp.id} style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                                <div style={{ padding: '0.9rem 1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: rooms.length > 0 ? '1px solid var(--border-color)' : 'none', background: isEntry ? 'rgba(43,140,238,0.04)' : 'rgba(232,121,168,0.04)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <a
                                            href={`/api/inspections/${insp.id}/pdf`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem', background: 'var(--surface-active)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}
                                        >
                                            📄 PDF
                                        </a>
                                        <button
                                            onClick={() => handleDelete(insp.id, insp.lease.id)}
                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', opacity: 0.6, padding: '0.2rem 0.3rem' }}
                                            title="Supprimer"
                                        >×</button>
                                    </div>
                                </div>
                                {rooms.length > 0 && (
                                    <div style={{ padding: '0.75rem 1.1rem' }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                            {rooms.map((room, i) => {
                                                const c = CONDITION_LABELS[room.condition];
                                                return (
                                                    <span key={i} title={room.notes || room.name} style={{ fontSize: '0.78rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', background: c.bg, color: c.color, fontWeight: 500, border: `1px solid ${c.color}22` }}>
                                                        {room.name}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                        {insp.notes && (
                                            <p style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{insp.notes}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
