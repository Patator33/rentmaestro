'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cycleTaskStatusForTravaux, addTaskNote } from '@/actions/tasks';
import { formatDate } from '@/lib/utils';

interface TaskNote {
    id: string;
    content: string;
    authorType: string;
    createdAt: Date | string;
}

interface TaskWithNotes {
    id: string;
    title: string;
    description: string | null;
    status: string;
    cost: number | null;
    dueDate: Date | string | null;
    scheduledAt: Date | string | null;
    createdAt: Date | string;
    tenant: { id: string; firstName: string; lastName: string } | null;
    apartment: { id: string; address: string; name: string | null };
    notes: TaskNote[];
}

const STATUS_LABELS: Record<string, string> = {
    TODO: 'À traiter',
    IN_PROGRESS: 'En cours',
    DONE: 'Résolu',
};

const STATUS_COLORS: Record<string, string> = {
    TODO: '#ef4444',
    IN_PROGRESS: '#f59e0b',
    DONE: '#22c55e',
};

export default function TravauxClient({ initialTasks, showAll }: { initialTasks: TaskWithNotes[]; showAll: boolean }) {
    const router = useRouter();
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [noteText, setNoteText] = useState('');
    const [addingNote, setAddingNote] = useState(false);
    const [isPending, startTransition] = useTransition();

    const incidents = initialTasks.filter(t => t.tenant !== null);
    const travaux = initialTasks.filter(t => t.tenant === null);

    const selectedTask = selectedTaskId ? initialTasks.find(t => t.id === selectedTaskId) ?? null : null;

    const handleCycleStatus = (taskId: string, currentStatus: string) => {
        startTransition(async () => {
            await cycleTaskStatusForTravaux(taskId, currentStatus);
            router.refresh();
        });
    };

    const handleAddNote = async () => {
        if (!selectedTask || !noteText.trim()) return;
        setAddingNote(true);
        const res = await addTaskNote(selectedTask.id, noteText.trim(), 'LANDLORD');
        if (res.success) {
            setNoteText('');
            router.refresh();
        }
        setAddingNote(false);
    };

    const renderCard = (task: TaskWithNotes) => {
        const nextLabel = task.status === 'TODO' ? 'En cours →' : task.status === 'IN_PROGRESS' ? '✓ Résolu' : 'Réouvrir';
        const noteCount = task.notes.length;
        return (
            <div
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                style={{
                    background: 'var(--surface)', border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem',
                    display: 'flex', alignItems: 'flex-start', gap: '1rem',
                    cursor: 'pointer', transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary-color)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
            >
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>{task.title}</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '4px', background: `${STATUS_COLORS[task.status]}20`, color: STATUS_COLORS[task.status] }}>
                            {STATUS_LABELS[task.status]}
                        </span>
                        {noteCount > 0 && (
                            <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(43,140,238,0.15)', color: 'var(--primary-color)' }}>
                                💬 {noteCount}
                            </span>
                        )}
                    </div>
                    {task.description && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>{task.description}</p>
                    )}
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <Link
                            href={`/apartments/${task.apartment.id}`}
                            style={{ color: 'var(--primary-color)' }}
                            onClick={e => e.stopPropagation()}
                        >
                            🏠 {task.apartment.name || task.apartment.address}
                        </Link>
                        {task.tenant && (
                            <Link
                                href={`/tenants/${task.tenant.id}`}
                                style={{ color: 'var(--text-secondary)' }}
                                onClick={e => e.stopPropagation()}
                            >
                                👤 {task.tenant.firstName} {task.tenant.lastName}
                            </Link>
                        )}
                        {task.dueDate && <span>📅 {formatDate(task.dueDate as any)}</span>}
                        {task.scheduledAt && <span>🔧 {formatDate(task.scheduledAt as any)}</span>}
                        {task.cost != null && <span>💰 {task.cost.toFixed(2)} €</span>}
                        {!task.dueDate && !task.scheduledAt && <span>{formatDate(task.createdAt as any)}</span>}
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    {task.status !== 'DONE' && (
                        <button
                            onClick={() => handleCycleStatus(task.id, task.status)}
                            disabled={isPending}
                            style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', padding: '0.3rem 0.7rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--primary-color)', background: 'rgba(43,140,238,0.1)', color: 'var(--primary-color)', cursor: 'pointer', opacity: isPending ? 0.5 : 1 }}
                        >
                            {nextLabel}
                        </button>
                    )}
                    <button
                        onClick={() => setSelectedTaskId(task.id)}
                        style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', padding: '0.3rem 0.7rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    >
                        + Note
                    </button>
                </div>
            </div>
        );
    };

    return (
        <>
            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    Incidents locataires — {incidents.length}
                </h2>
                {incidents.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                        Aucun incident{showAll ? '' : ' ouvert'}.
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {incidents.map(renderCard)}
                    </div>
                )}
            </section>

            <section>
                <h2 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    Travaux & entretien — {travaux.length}
                </h2>
                {travaux.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                        Aucun travail{showAll ? '' : ' en cours'}.
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {travaux.map(renderCard)}
                    </div>
                )}
            </section>

            {/* ─── POPUP ─────────────────────────────────────────────────────── */}
            {selectedTask && (
                <div
                    style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                    onClick={() => setSelectedTaskId(null)}
                >
                    <div
                        style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border-color)', width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                            <div style={{ flex: 1 }}>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.4rem' }}>{selectedTask.title}</h2>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px', background: `${STATUS_COLORS[selectedTask.status]}20`, color: STATUS_COLORS[selectedTask.status] }}>
                                    {STATUS_LABELS[selectedTask.status]}
                                </span>
                            </div>
                            <button
                                onClick={() => setSelectedTaskId(null)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer', padding: '0.2rem', flexShrink: 0, lineHeight: 1 }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Description */}
                        {selectedTask.description && (
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', margin: 0 }}>{selectedTask.description}</p>
                        )}

                        {/* Metadata */}
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '0.75rem', background: 'var(--surface-active, #1a1f2e)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            <div>
                                🏠{' '}
                                <Link
                                    href={`/apartments/${selectedTask.apartment.id}`}
                                    style={{ color: 'var(--primary-color)', textDecoration: 'none' }}
                                    onClick={() => setSelectedTaskId(null)}
                                >
                                    {selectedTask.apartment.name || selectedTask.apartment.address}
                                </Link>
                            </div>
                            {selectedTask.tenant && (
                                <div>
                                    👤{' '}
                                    <Link
                                        href={`/tenants/${selectedTask.tenant.id}`}
                                        style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
                                        onClick={() => setSelectedTaskId(null)}
                                    >
                                        {selectedTask.tenant.firstName} {selectedTask.tenant.lastName}
                                    </Link>
                                </div>
                            )}
                            <div>📅 Créé le {formatDate(selectedTask.createdAt as any)}</div>
                            {selectedTask.dueDate && <div>⏰ Échéance : {formatDate(selectedTask.dueDate as any)}</div>}
                            {selectedTask.scheduledAt && <div>🔧 Intervention : {formatDate(selectedTask.scheduledAt as any)}</div>}
                            {selectedTask.cost != null && <div>💰 Coût : {selectedTask.cost.toFixed(2)} €</div>}
                        </div>

                        {/* Notes history */}
                        <div>
                            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                                Historique ({selectedTask.notes.length})
                            </h3>
                            {selectedTask.notes.length === 0 ? (
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucune mise à jour.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {selectedTask.notes.map(note => (
                                        <div
                                            key={note.id}
                                            style={{
                                                padding: '0.6rem 0.75rem',
                                                background: 'var(--surface-active, #1a1f2e)',
                                                borderRadius: '8px',
                                                borderLeft: `3px solid ${note.authorType === 'TENANT' ? '#f59e0b' : 'var(--primary-color)'}`,
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: note.authorType === 'TENANT' ? '#f59e0b' : 'var(--primary-color)' }}>
                                                    {note.authorType === 'TENANT' ? '👤 Locataire' : '🏠 Propriétaire'}
                                                </span>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                    {new Date(note.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', margin: 0, whiteSpace: 'pre-wrap' }}>{note.content}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Add note */}
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                            <textarea
                                value={noteText}
                                onChange={e => setNoteText(e.target.value)}
                                placeholder="Ajouter une mise à jour..."
                                rows={2}
                                style={{ flex: 1, padding: '0.6rem 0.75rem', background: 'var(--surface-active, #1a1f2e)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.875rem', resize: 'none', fontFamily: 'inherit', outline: 'none' }}
                                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddNote(); }}
                            />
                            <button
                                onClick={handleAddNote}
                                disabled={addingNote || !noteText.trim()}
                                style={{ padding: '0.6rem 1rem', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, flexShrink: 0, opacity: (addingNote || !noteText.trim()) ? 0.5 : 1 }}
                            >
                                {addingNote ? '...' : 'Ajouter'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
