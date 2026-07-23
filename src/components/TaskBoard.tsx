'use client';

import { useState } from 'react';
import { createTask, updateTask, updateTaskStatus, deleteTask, convertTaskToExpense, addTaskNote, updateTaskNote, uploadTaskDocument, deleteTaskDocument } from '@/actions/tasks';
import styles from './TaskBoard.module.css';

interface TaskNote {
    id: string;
    content: string;
    authorType: string;
    createdAt: Date | string;
}

interface TaskDoc {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
    createdAt: Date | string;
}

interface Task {
    id: string;
    apartmentId: string;
    tenantId: string | null;
    title: string;
    description: string | null;
    status: string;
    cost: number | null;
    dueDate: Date | null;
    scheduledAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    notes: TaskNote[];
    documents: TaskDoc[];
}

interface TaskBoardProps {
    apartmentId: string;
    apartmentAddress?: string;
    initialTasks: Task[];
}

const STATUS_COLORS: Record<string, string> = {
    TODO: '#ef4444',
    IN_PROGRESS: '#f59e0b',
    DONE: '#22c55e',
};

function formatGCalDate(d: Date): string {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function buildGCalUrl(task: Task, address: string): string {
    const start = formatGCalDate(new Date(task.scheduledAt!));
    const end = formatGCalDate(new Date(new Date(task.scheduledAt!).getTime() + 3600000));
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(task.title)}&dates=${start}/${end}&details=${encodeURIComponent(task.description || '')}&location=${encodeURIComponent(address)}`;
}

export default function TaskBoard({ apartmentId, apartmentAddress = '', initialTasks }: TaskBoardProps) {
    const [tasks, setTasks] = useState<Task[]>(initialTasks);
    const [loading, setLoading] = useState(false);

    // Add form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [cost, setCost] = useState('');
    const [scheduledAt, setScheduledAt] = useState('');

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editCost, setEditCost] = useState('');
    const [editStatus, setEditStatus] = useState('');
    const [editScheduledAt, setEditScheduledAt] = useState('');
    const [editNotify, setEditNotify] = useState(false);

    // Notes popup state
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [noteText, setNoteText] = useState('');
    const [addingNote, setAddingNote] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [editingNoteText, setEditingNoteText] = useState('');
    const [savingNote, setSavingNote] = useState(false);
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

    const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) ?? null : null;

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await createTask({
            apartmentId,
            title,
            description: description || null,
            cost: cost ? parseFloat(cost) : null,
            status: 'TODO',
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        });
        if (res.success && res.task) {
            setTasks([(res.task as any as Task), ...tasks]);
            setTitle('');
            setDescription('');
            setCost('');
            setScheduledAt('');
        } else {
            alert(res.error || "Erreur lors de l'ajout");
        }
        setLoading(false);
    };

    const startEdit = (task: Task) => {
        setEditingId(task.id);
        setEditTitle(task.title);
        setEditDesc(task.description || '');
        setEditCost(task.cost !== null ? String(task.cost) : '');
        setEditStatus(task.status);
        setEditScheduledAt(task.scheduledAt ? new Date(task.scheduledAt).toISOString().slice(0, 16) : '');
        setEditNotify(false);
    };

    const handleSaveEdit = async (taskId: string) => {
        setLoading(true);
        const res = await updateTask(taskId, {
            title: editTitle,
            description: editDesc || null,
            cost: editCost ? parseFloat(editCost) : null,
            status: editStatus,
            scheduledAt: editScheduledAt ? new Date(editScheduledAt) : null,
            notifyTenant: editNotify,
        });
        if (res.success && res.task) {
            setTasks(tasks.map(t => t.id === taskId ? { ...(res.task! as any as Task), notes: t.notes } : t));
            setEditingId(null);
        } else {
            alert(res.error || "Erreur lors de la modification");
        }
        setLoading(false);
    };

    const handleUpdateStatus = async (taskId: string, newStatus: string) => {
        const currentTasks = [...tasks];
        setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        const res = await updateTaskStatus(taskId, newStatus);
        if (!res.success) {
            setTasks(currentTasks);
            alert(res.error || "Erreur lors de la mise à jour");
        }
    };

    const handleDelete = async (taskId: string) => {
        if (!confirm("Voulez-vous supprimer cette tâche ?")) return;
        const currentTasks = [...tasks];
        setTasks(tasks.filter(t => t.id !== taskId));
        const res = await deleteTask(taskId);
        if (!res.success) {
            setTasks(currentTasks);
            alert(res.error || "Erreur lors de la suppression");
        }
    };

    const handleConvertToExpense = async (taskId: string) => {
        if (!confirm("Voulez-vous convertir cette intervention en Dépense ? Une dépense sera ajoutée aux statistiques de cet appartement.")) return;
        setLoading(true);
        const res = await convertTaskToExpense(taskId);
        if (res.success) {
            alert("✅ Dépense créée avec succès !");
        } else {
            alert("❌ Erreur : " + res.error);
        }
        setLoading(false);
    };

    const handleAddNote = async () => {
        if (!selectedTask || !noteText.trim()) return;
        setAddingNote(true);
        const res = await addTaskNote(selectedTask.id, noteText.trim(), 'LANDLORD');
        if (res.success && res.note) {
            const newNote = res.note as TaskNote;
            setTasks(prev => prev.map(t =>
                t.id === selectedTask.id
                    ? { ...t, notes: [...t.notes, newNote] }
                    : t
            ));
            setNoteText('');
        }
        setAddingNote(false);
    };

    const startEditNote = (note: TaskNote) => {
        setEditingNoteId(note.id);
        setEditingNoteText(note.content);
    };

    const cancelEditNote = () => {
        setEditingNoteId(null);
        setEditingNoteText('');
    };

    const handleSaveNote = async () => {
        if (!selectedTask || !editingNoteId || !editingNoteText.trim()) return;
        setSavingNote(true);
        const res = await updateTaskNote(editingNoteId, editingNoteText.trim());
        if (res.success && res.note) {
            const updated = res.note as TaskNote;
            setTasks(prev => prev.map(t =>
                t.id === selectedTask.id
                    ? { ...t, notes: t.notes.map(n => n.id === updated.id ? updated : n) }
                    : t
            ));
            setEditingNoteId(null);
            setEditingNoteText('');
        }
        setSavingNote(false);
    };

    const handleUploadDocument = async (file: File) => {
        if (!selectedTask) return;
        setUploadingDoc(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('taskId', selectedTask.id);
        const res = await uploadTaskDocument(formData);
        if (res.success && res.document) {
            const doc = res.document as TaskDoc;
            setTasks(prev => prev.map(t =>
                t.id === selectedTask.id ? { ...t, documents: [doc, ...t.documents] } : t
            ));
        } else {
            alert(res.error || "Impossible d'ajouter le document");
        }
        setUploadingDoc(false);
    };

    const handleDeleteDocument = async (docId: string) => {
        if (!selectedTask) return;
        if (!confirm('Supprimer ce document ?')) return;
        setDeletingDocId(docId);
        const res = await deleteTaskDocument(docId);
        if (res.success) {
            setTasks(prev => prev.map(t =>
                t.id === selectedTask.id ? { ...t, documents: t.documents.filter(d => d.id !== docId) } : t
            ));
        } else {
            alert(res.error || "Impossible de supprimer le document");
        }
        setDeletingDocId(null);
    };

    const renderTaskCard = (task: Task) => {
        const isEditing = editingId === task.id;

        return (
            <div
                key={task.id}
                className={styles.taskCard}
                onClick={() => { if (!isEditing) setSelectedTaskId(task.id); }}
                style={{ cursor: isEditing ? 'default' : 'pointer' }}
            >
                {isEditing ? (
                    /* ---- Edit form ---- */
                    <div onClick={e => e.stopPropagation()}>
                        <div className={styles.formGroup} style={{ marginBottom: '0.6rem' }}>
                            <label>Titre</label>
                            <input
                                type="text"
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                                required
                            />
                        </div>
                        <div className={styles.formGroup} style={{ marginBottom: '0.6rem' }}>
                            <label>Description</label>
                            <textarea
                                value={editDesc}
                                onChange={e => setEditDesc(e.target.value)}
                                rows={2}
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                            <div className={styles.formGroup}>
                                <label>Coût (€)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editCost}
                                    onChange={e => setEditCost(e.target.value)}
                                    placeholder="Optionnel"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Statut</label>
                                <select
                                    value={editStatus}
                                    onChange={e => setEditStatus(e.target.value)}
                                    style={{ padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontFamily: 'inherit', fontSize: '0.95rem' }}
                                >
                                    <option value="TODO">À Faire</option>
                                    <option value="IN_PROGRESS">En Cours</option>
                                    <option value="DONE">Terminé</option>
                                </select>
                            </div>
                        </div>
                        <div className={styles.formGroup} style={{ marginBottom: '0.6rem' }}>
                            <label>Date d'intervention</label>
                            <input
                                type="datetime-local"
                                value={editScheduledAt}
                                onChange={e => setEditScheduledAt(e.target.value)}
                            />
                        </div>
                        {task.tenantId && (
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', marginBottom: '0.6rem', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={editNotify}
                                    onChange={e => setEditNotify(e.target.checked)}
                                />
                                Notifier le locataire par email
                            </label>
                        )}
                        <div className={styles.actions}>
                            <button onClick={() => handleSaveEdit(task.id)} disabled={loading || !editTitle.trim()} className={`${styles.btn} ${styles.btnPrimary}`}>
                                {loading ? '...' : '✓ Enregistrer'}
                            </button>
                            <button onClick={() => setEditingId(null)} className={styles.btn}>
                                Annuler
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ---- Normal view ---- */
                    <>
                        <div className={styles.taskHeader}>
                            <span className={styles.taskTitle}>
                                {task.title}
                                {task.tenantId && <span style={{ marginLeft: "0.5rem", fontSize: "0.7rem", backgroundColor: "#fffbeb", color: "#d97706", padding: "0.2rem 0.5rem", borderRadius: "10px", fontWeight: "bold" }}>Locataire</span>}
                                {task.notes.length > 0 && (
                                    <span style={{ marginLeft: "0.4rem", fontSize: "0.7rem", background: "rgba(43,140,238,0.15)", color: "#2b8cee", padding: "0.1rem 0.4rem", borderRadius: "4px" }}>
                                        💬 {task.notes.length}
                                    </span>
                                )}
                            </span>
                            <div style={{ display: 'flex', gap: '0.25rem' }} onClick={e => e.stopPropagation()}>
                                <button onClick={() => startEdit(task)} className={styles.deleteBtn} title="Modifier" style={{ color: '#2b8cee', fontSize: '0.9rem' }}>✏️</button>
                                <button onClick={() => handleDelete(task.id)} className={styles.deleteBtn} title="Supprimer">×</button>
                            </div>
                        </div>
                        {task.description && <div className={styles.taskDesc}>{task.description}</div>}

                        {task.scheduledAt && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--primary-color)', marginTop: '0.3rem' }}>
                                📅 {new Date(task.scheduledAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                {' '}
                                <a
                                    href={buildGCalUrl(task, apartmentAddress)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ fontSize: '0.75rem', color: '#22c55e', marginLeft: '0.3rem' }}
                                    onClick={e => e.stopPropagation()}
                                >
                                    + Google Agenda
                                </a>
                            </div>
                        )}

                        <div className={styles.taskFooter}>
                            <span>{new Date(task.createdAt).toLocaleDateString('fr-FR')}</span>
                            {task.cost !== null && <span className={styles.taskCost}>{task.cost.toFixed(2)} €</span>}
                        </div>

                        <div className={styles.actions} onClick={e => e.stopPropagation()}>
                            {task.status === 'TODO' && (
                                <button onClick={() => handleUpdateStatus(task.id, 'IN_PROGRESS')} className={`${styles.btn} ${styles.btnPrimary}`}>
                                    Passer En Cours
                                </button>
                            )}
                            {task.status === 'IN_PROGRESS' && (
                                <>
                                    <button onClick={() => handleUpdateStatus(task.id, 'TODO')} className={styles.btn}>
                                        À Faire
                                    </button>
                                    <button onClick={() => handleUpdateStatus(task.id, 'DONE')} className={`${styles.btn} ${styles.btnSuccess}`}>
                                        Terminer
                                    </button>
                                </>
                            )}
                            {task.status === 'DONE' && (
                                <>
                                    <button onClick={() => handleUpdateStatus(task.id, 'IN_PROGRESS')} className={styles.btn}>
                                        En Cours
                                    </button>
                                    {task.cost !== null && task.cost > 0 && (
                                        <button onClick={() => handleConvertToExpense(task.id)} disabled={loading} className={`${styles.btn} ${styles.btnPrimary}`}>
                                            {loading ? '...' : 'Créer Dépense'}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>
        );
    };

    const todoTasks = tasks.filter(t => t.status === 'TODO');
    const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS');
    const doneTasks = tasks.filter(t => t.status === 'DONE');

    return (
        <div>
            {/* Add Task Form */}
            <form onSubmit={handleAddTask} className={styles.addForm}>
                <h3 style={{ marginBottom: '1rem', color: '#1e293b' }}>Ajouter une intervention</h3>
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label>Titre de l'intervention</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Ex: Réparation fuite évier"
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Coût estimé ou final (€)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={cost}
                            onChange={e => setCost(e.target.value)}
                            placeholder="Optionnel"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Date d'intervention</label>
                        <input
                            type="datetime-local"
                            value={scheduledAt}
                            onChange={e => setScheduledAt(e.target.value)}
                        />
                    </div>
                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                        <label>Description (Optionnel)</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={2}
                            placeholder="Détails de l'intervention..."
                        />
                    </div>
                </div>
                <button type="submit" disabled={loading || !title} className={styles.addBtn}>
                    {loading ? 'Ajout...' : '+ Ajouter la tâche'}
                </button>
            </form>

            {/* Kanban Board */}
            <div className={styles.board}>
                <div className={styles.column}>
                    <div className={styles.columnTitle}>
                        À Faire <span className={styles.taskCount}>{todoTasks.length}</span>
                    </div>
                    {todoTasks.map(renderTaskCard)}
                </div>

                <div className={styles.column}>
                    <div className={styles.columnTitle}>
                        En Cours <span className={styles.taskCount}>{inProgressTasks.length}</span>
                    </div>
                    {inProgressTasks.map(renderTaskCard)}
                </div>

                <div className={styles.column}>
                    <div className={styles.columnTitle}>
                        Terminé <span className={styles.taskCount}>{doneTasks.length}</span>
                    </div>
                    {doneTasks.map(renderTaskCard)}
                </div>
            </div>

            {/* ─── NOTES POPUP ──────────────────────────────────────────────── */}
            {selectedTask && (
                <div
                    style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                    onClick={() => setSelectedTaskId(null)}
                >
                    <div
                        style={{ background: 'var(--background)', borderRadius: '12px', border: '1px solid var(--border-color)', width: '100%', maxWidth: 540, maxHeight: '85vh', overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                            <div style={{ flex: 1 }}>
                                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.35rem' }}>{selectedTask.title}</h2>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: '4px', background: `${STATUS_COLORS[selectedTask.status] ?? '#6b7280'}20`, color: STATUS_COLORS[selectedTask.status] ?? '#6b7280' }}>
                                        {selectedTask.status === 'TODO' ? 'À traiter' : selectedTask.status === 'IN_PROGRESS' ? 'En cours' : 'Terminé'}
                                    </span>
                                    <button
                                        onClick={() => { setSelectedTaskId(null); startEdit(selectedTask); }}
                                        style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '4px', border: '1px solid var(--primary-color)', background: 'rgba(43,140,238,0.1)', color: 'var(--primary-color)', cursor: 'pointer' }}
                                    >
                                        ✏️ Modifier
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedTaskId(null)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer', padding: '0.2rem', flexShrink: 0, lineHeight: 1 }}
                            >
                                ✕
                            </button>
                        </div>

                        {selectedTask.description && (
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', margin: 0 }}>{selectedTask.description}</p>
                        )}

                        {/* Metadata */}
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '0.65rem 0.75rem', background: 'var(--surface-active, #f8fafc)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div>📅 Créé le {new Date(selectedTask.createdAt).toLocaleDateString('fr-FR')}</div>
                            {selectedTask.scheduledAt && <div>🔧 Intervention : {new Date(selectedTask.scheduledAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>}
                            {selectedTask.dueDate && <div>⏰ Échéance : {new Date(selectedTask.dueDate).toLocaleDateString('fr-FR')}</div>}
                            {selectedTask.cost != null && <div>💰 Coût : {selectedTask.cost.toFixed(2)} €</div>}
                        </div>

                        {/* Documents */}
                        <div>
                            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                                Documents ({selectedTask.documents.length})
                            </h3>
                            {selectedTask.documents.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.6rem' }}>
                                    {selectedTask.documents.map(doc => (
                                        <div
                                            key={doc.id}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--surface-active, #f8fafc)', borderRadius: '8px' }}
                                        >
                                            <a
                                                href={encodeURI(doc.url.replace('/uploads/', '/api/documents/'))}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ fontSize: '0.85rem', color: '#2b8cee', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                            >
                                                📄 {doc.name}
                                            </a>
                                            <button
                                                onClick={() => handleDeleteDocument(doc.id)}
                                                disabled={deletingDocId === doc.id}
                                                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem', flexShrink: 0, opacity: deletingDocId === doc.id ? 0.5 : 1 }}
                                                title="Supprimer"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <label style={{ display: 'inline-block', fontSize: '0.8rem', padding: '0.4rem 0.75rem', border: '1px dashed var(--border-color)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: uploadingDoc ? 'default' : 'pointer', opacity: uploadingDoc ? 0.6 : 1 }}>
                                {uploadingDoc ? 'Envoi...' : '📎 Ajouter un document'}
                                <input
                                    type="file"
                                    disabled={uploadingDoc}
                                    onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadDocument(f); e.target.value = ''; }}
                                    style={{ display: 'none' }}
                                />
                            </label>
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
                                            style={{ padding: '0.6rem 0.75rem', background: 'var(--surface-active, #f8fafc)', borderRadius: '8px', borderLeft: `3px solid ${note.authorType === 'TENANT' ? '#f59e0b' : '#2b8cee'}` }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                                                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: note.authorType === 'TENANT' ? '#f59e0b' : '#2b8cee' }}>
                                                    {note.authorType === 'TENANT' ? '👤 Locataire' : '🏠 Propriétaire'}
                                                </span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                        {new Date(note.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {editingNoteId !== note.id && (
                                                        <button
                                                            onClick={() => startEditNote(note)}
                                                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}
                                                            title="Modifier"
                                                        >
                                                            ✏️
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {editingNoteId === note.id ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                    <textarea
                                                        value={editingNoteText}
                                                        onChange={e => setEditingNoteText(e.target.value)}
                                                        rows={2}
                                                        autoFocus
                                                        style={{ padding: '0.5rem 0.6rem', background: 'var(--background)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)', fontSize: '0.875rem', resize: 'none', fontFamily: 'inherit', outline: 'none' }}
                                                    />
                                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                        <button
                                                            onClick={handleSaveNote}
                                                            disabled={savingNote || !editingNoteText.trim()}
                                                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: '6px', border: 'none', background: '#2b8cee', color: 'white', cursor: 'pointer', opacity: (savingNote || !editingNoteText.trim()) ? 0.5 : 1 }}
                                                        >
                                                            {savingNote ? '...' : 'Enregistrer'}
                                                        </button>
                                                        <button
                                                            onClick={cancelEditNote}
                                                            disabled={savingNote}
                                                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                                        >
                                                            Annuler
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', margin: 0, whiteSpace: 'pre-wrap' }}>{note.content}</p>
                                            )}
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
                                style={{ flex: 1, padding: '0.6rem 0.75rem', background: 'var(--surface-active, #f8fafc)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.875rem', resize: 'none', fontFamily: 'inherit', outline: 'none' }}
                                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddNote(); }}
                            />
                            <button
                                onClick={handleAddNote}
                                disabled={addingNote || !noteText.trim()}
                                style={{ padding: '0.6rem 1rem', background: '#2b8cee', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, flexShrink: 0, opacity: (addingNote || !noteText.trim()) ? 0.5 : 1 }}
                            >
                                {addingNote ? '...' : 'Ajouter'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
