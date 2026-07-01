import { useState, useEffect, useRef } from 'react';
import { api } from '../api/landlord';

const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_TOLERANCE = 10;

interface TaskNote {
  id: string;
  content: string;
  authorType: string;
  createdAt: string;
}

export interface TaskForPopup {
  id: string;
  title: string;
  description: string | null;
  status: string;
  cost: number | null;
  dueDate: string | null;
  createdAt: string;
  tenant?: { id: string; firstName: string; lastName: string } | null;
  apartment?: { id: string; address: string; name: string | null };
}

const STATUS_LABELS: Record<string, string> = {
  TODO: 'À traiter',
  IN_PROGRESS: 'En cours',
  DONE: 'Résolu',
};
const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  TODO: { bg: '#ef444420', color: '#ef4444' },
  IN_PROGRESS: { bg: '#f59e0b20', color: '#f59e0b' },
  DONE: { bg: '#22c55e20', color: '#22c55e' },
};

export default function TaskDetailPopup({
  task,
  onClose,
  onEdit,
}: {
  task: TaskForPopup;
  onClose: () => void;
  onEdit?: (task: TaskForPopup) => void;
}) {
  const [notes, setNotes] = useState<TaskNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const longPressTimer = useRef<number | null>(null);
  const longPressStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    api.getTaskNotes(task.id)
      .then(setNotes)
      .catch(() => setNotes([]))
      .finally(() => setLoadingNotes(false));
  }, [task.id]);

  const handleAddNote = async () => {
    const content = noteText.trim();
    if (!content) return;
    setAddingNote(true);
    try {
      const note = await api.addTaskNote(task.id, content);
      setNotes(prev => [...prev, note]);
      setNoteText('');
    } catch {
      // silent failure
    } finally {
      setAddingNote(false);
    }
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
    if (!editingNoteId || !editingNoteText.trim()) return;
    setSavingNote(true);
    try {
      const updated = await api.updateTaskNote(task.id, editingNoteId, editingNoteText.trim());
      setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
      setEditingNoteId(null);
      setEditingNoteText('');
    } catch {
      // silent failure
    } finally {
      setSavingNote(false);
    }
  };

  const clearLongPressTimer = () => {
    if (longPressTimer.current != null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    longPressStart.current = null;
  };

  const handlePressStart = (note: TaskNote, e: React.PointerEvent) => {
    longPressStart.current = { x: e.clientX, y: e.clientY };
    longPressTimer.current = window.setTimeout(() => {
      startEditNote(note);
      longPressTimer.current = null;
    }, LONG_PRESS_MS);
  };

  const handlePressMove = (e: React.PointerEvent) => {
    if (!longPressStart.current) return;
    const dx = e.clientX - longPressStart.current.x;
    const dy = e.clientY - longPressStart.current.y;
    if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_TOLERANCE) clearLongPressTimer();
  };

  const s = STATUS_STYLE[task.status] ?? { bg: '#6b728020', color: '#6b7280' };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-t-2xl"
        style={{ maxHeight: '75vh', overflowY: 'auto', marginBottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))', paddingBottom: '1.25rem' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-3 gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-text-main leading-snug mb-2">{task.title}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>
                {STATUS_LABELS[task.status] ?? task.status}
              </span>
              {onEdit && (
                <button
                  onClick={() => { onClose(); onEdit(task); }}
                  className="text-xs font-semibold px-2.5 py-0.5 rounded-full border"
                  style={{ color: '#2b8cee', borderColor: '#2b8cee40', background: '#2b8cee15' }}
                >
                  ✏️ Modifier
                </button>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted text-xl px-1 shrink-0 leading-none">✕</button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Description */}
          {task.description && (
            <p className="text-text-secondary text-sm whitespace-pre-wrap">{task.description}</p>
          )}

          {/* Metadata */}
          <div className="bg-bg rounded-xl border border-border p-3 space-y-1 text-sm text-text-muted">
            {task.apartment && (
              <p>🏠 {task.apartment.name || task.apartment.address}</p>
            )}
            {task.tenant && (
              <p>👤 {task.tenant.firstName} {task.tenant.lastName}</p>
            )}
            <p>📅 Créé le {new Date(task.createdAt).toLocaleDateString('fr-FR')}</p>
            {task.dueDate && <p>⏰ Échéance : {new Date(task.dueDate).toLocaleDateString('fr-FR')}</p>}
            {task.cost != null && <p>💰 {Number(task.cost).toFixed(2)} €</p>}
          </div>

          {/* Notes history */}
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wide font-semibold mb-2">
              Historique {!loadingNotes && `(${notes.length})`}
            </p>
            {loadingNotes ? (
              <p className="text-xs text-text-muted">Chargement...</p>
            ) : notes.length === 0 ? (
              <p className="text-xs text-text-muted italic">Aucune mise à jour.</p>
            ) : (
              <div className="space-y-2">
                {notes.map(note => (
                  <div
                    key={note.id}
                    className="bg-bg rounded-xl p-3"
                    style={{ borderLeft: `3px solid ${note.authorType === 'TENANT' ? '#f59e0b' : '#2b8cee'}`, userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'manipulation' }}
                    onPointerDown={editingNoteId === note.id ? undefined : e => handlePressStart(note, e)}
                    onPointerMove={handlePressMove}
                    onPointerUp={clearLongPressTimer}
                    onPointerLeave={clearLongPressTimer}
                    onPointerCancel={clearLongPressTimer}
                    onContextMenu={e => e.preventDefault()}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold" style={{ color: note.authorType === 'TENANT' ? '#f59e0b' : '#2b8cee' }}>
                        {note.authorType === 'TENANT' ? '👤 Locataire' : '🏠 Propriétaire'}
                      </span>
                      <span className="text-xs text-text-muted">
                        {new Date(note.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {editingNoteId === note.id ? (
                      <div className="space-y-2" style={{ userSelect: 'auto' }}>
                        <textarea
                          className="w-full bg-surface border border-border rounded-lg px-2.5 py-2 text-text-main text-sm focus:outline-none focus:border-primary"
                          value={editingNoteText}
                          onChange={e => setEditingNoteText(e.target.value)}
                          rows={2}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveNote}
                            disabled={savingNote || !editingNoteText.trim()}
                            className="px-2.5 py-1 bg-primary text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                          >
                            {savingNote ? '...' : 'Enregistrer'}
                          </button>
                          <button
                            onClick={cancelEditNote}
                            disabled={savingNote}
                            className="px-2.5 py-1 border border-border text-text-secondary text-xs font-semibold rounded-lg"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-text-main whitespace-pre-wrap">{note.content}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add note */}
          <div className="flex gap-2 items-center">
            <input
              className="flex-1 bg-bg border border-border rounded-xl px-3 py-2 text-text-main text-sm focus:outline-none focus:border-primary"
              type="text"
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Ajouter une mise à jour..."
              onKeyDown={e => { if (e.key === 'Enter') handleAddNote(); }}
            />
            <button
              onClick={handleAddNote}
              disabled={addingNote || !noteText.trim()}
              className="shrink-0 px-3 py-2 bg-primary text-white text-sm font-semibold rounded-xl disabled:opacity-50"
            >
              {addingNote ? '...' : '→'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
