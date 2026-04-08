import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/landlord';
import PullToRefresh from '../components/PullToRefresh';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  cost: number | null;
  dueDate: string | null;
  createdAt: string;
  tenant?: { id: string; firstName: string; lastName: string } | null;
  apartment: { id: string; address: string; name: string | null };
}

interface Apartment {
  id: string;
  name: string | null;
  address: string;
}

const STATUS_LABELS: Record<string, string> = {
  TODO: 'À traiter',
  IN_PROGRESS: 'En cours',
  DONE: 'Résolu',
};
const STATUS_COLORS: Record<string, string> = {
  TODO: 'text-late',
  IN_PROGRESS: 'text-pending',
  DONE: 'text-paid',
};

type EditingTask = Task | 'new' | null;

function TaskModal({
  task,
  apartments,
  onClose,
  onSaved,
  onDeleted,
}: {
  task: EditingTask;
  apartments: Apartment[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const isNew = task === 'new';
  const initial = isNew ? null : (task as Task);

  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [status, setStatus] = useState(initial?.status ?? 'TODO');
  const [cost, setCost] = useState(initial?.cost != null ? String(initial.cost) : '');
  const [dueDate, setDueDate] = useState(initial?.dueDate ? initial.dueDate.substring(0, 10) : '');
  const [apartmentId, setApartmentId] = useState(initial?.apartment?.id ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!title.trim()) { setError('Le titre est requis.'); return; }
    if (isNew && !apartmentId) { setError('Sélectionnez un bien.'); return; }
    setSaving(true);
    setError('');
    try {
      const data: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        cost: cost !== '' ? parseFloat(cost) : null,
        dueDate: dueDate || null,
      };
      if (isNew) {
        data.apartmentId = apartmentId;
        await api.createTask(data);
      } else {
        data.status = status;
        await api.updateTaskFull((task as Task).id, data);
      }
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initial) return;
    setDeleting(true);
    try {
      await api.deleteTask(initial.id);
      onDeleted();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setDeleting(false);
    }
  };

  const inputClass = 'w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-text-main text-sm focus:outline-none focus:border-primary';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-t-2xl p-5 space-y-3"
        style={{ maxHeight: '85vh', overflowY: 'auto', paddingBottom: 'calc(1.25rem + 4rem + env(safe-area-inset-bottom))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-bold text-text-main">{isNew ? 'Nouveau travail' : 'Modifier le travail'}</h2>
          <button onClick={onClose} className="text-text-muted text-lg px-1">✕</button>
        </div>

        {error && <p className="text-xs text-late bg-late/10 px-3 py-2 rounded-lg">{error}</p>}

        <div className="space-y-2">
          <label className="text-xs text-text-muted font-semibold uppercase tracking-wide">Titre *</label>
          <input className={inputClass} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Fuite robinet cuisine" />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-text-muted font-semibold uppercase tracking-wide">Description</label>
          <textarea
            className={inputClass}
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Détails..."
            style={{ resize: 'none' }}
          />
        </div>

        {!isNew && (
          <div className="space-y-2">
            <label className="text-xs text-text-muted font-semibold uppercase tracking-wide">Statut</label>
            <select className={inputClass} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="TODO">À traiter</option>
              <option value="IN_PROGRESS">En cours</option>
              <option value="DONE">Résolu</option>
            </select>
          </div>
        )}

        {isNew && (
          <div className="space-y-2">
            <label className="text-xs text-text-muted font-semibold uppercase tracking-wide">Bien *</label>
            <select className={inputClass} value={apartmentId} onChange={e => setApartmentId(e.target.value)}>
              <option value="">— Sélectionner un bien —</option>
              {apartments.map(a => (
                <option key={a.id} value={a.id}>{a.name || a.address}</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <label className="text-xs text-text-muted font-semibold uppercase tracking-wide">Coût (€)</label>
            <input
              className={inputClass}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={cost}
              onChange={e => setCost(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-text-muted font-semibold uppercase tracking-wide">Échéance</label>
            <input
              className={inputClass}
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          {!isNew && (
            <button
              onClick={handleDelete}
              disabled={deleting || saving}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-late/40 text-late disabled:opacity-50"
            >
              {deleting ? '...' : 'Supprimer'}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || deleting}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : isNew ? 'Créer' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskCard({ item, onCycle, onEdit, actionLoading }: {
  item: Task;
  onCycle: (t: Task) => void;
  onEdit: (t: Task) => void;
  actionLoading: string | null;
}) {
  return (
    <div className="bg-surface rounded-xl border border-border p-3" onClick={() => onEdit(item)}>
      <div className="flex items-start justify-between mb-1">
        <p className="text-text-main font-medium text-sm flex-1">{item.title}</p>
        <span className={`text-xs ml-2 shrink-0 ${STATUS_COLORS[item.status]}`}>{STATUS_LABELS[item.status]}</span>
      </div>
      {item.description && <p className="text-text-secondary text-xs mb-2">{item.description}</p>}
      <div className="flex items-center justify-between">
        <div>
          {item.tenant && <p className="text-text-muted text-xs">{item.tenant.firstName} {item.tenant.lastName}</p>}
          <p className="text-text-muted text-xs">{item.apartment.name || item.apartment.address}</p>
          {item.dueDate && <p className="text-text-muted text-xs">Échéance : {new Date(item.dueDate).toLocaleDateString('fr-FR')}</p>}
          {!item.dueDate && <p className="text-text-muted text-xs">{new Date(item.createdAt).toLocaleDateString('fr-FR')}</p>}
          {item.cost != null && <p className="text-text-muted text-xs">{item.cost.toFixed(2)} €</p>}
        </div>
        {item.status !== 'DONE' && (
          <button
            onClick={e => { e.stopPropagation(); onCycle(item); }}
            disabled={actionLoading === item.id}
            className="text-xs px-3 py-1.5 bg-primary/20 text-primary border border-primary/30 rounded-lg disabled:opacity-50"
          >
            {actionLoading === item.id ? '...' : item.status === 'TODO' ? 'En cours →' : '✓ Résolu'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Incidents() {
  const [incidents, setIncidents] = useState<Task[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<EditingTask>(null);
  const [apartments, setApartments] = useState<Apartment[]>([]);

  const load = useCallback((all: boolean) => {
    setLoading(true);
    Promise.all([api.getIncidents(all), api.getTasks(all)])
      .then(([inc, tsk]) => { setIncidents(inc); setTasks(tsk); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(showAll); }, [showAll, load]);

  const cycleStatus = async (item: Task, isIncident: boolean) => {
    const next = item.status === 'TODO' ? 'IN_PROGRESS' : item.status === 'IN_PROGRESS' ? 'DONE' : 'TODO';
    setActionLoading(item.id);
    try {
      if (isIncident) await api.updateIncident(item.id, next);
      else await api.updateTask(item.id, next);
      load(showAll);
    } finally {
      setActionLoading(null);
    }
  };

  const openCreate = async () => {
    if (apartments.length === 0) {
      const apts = await api.getApartments();
      setApartments(apts);
    }
    setEditingTask('new');
  };

  const handleModalSaved = () => {
    setEditingTask(null);
    load(showAll);
  };

  const handleModalDeleted = () => {
    setEditingTask(null);
    load(showAll);
  };

  return (
    <>
      {editingTask !== null && (
        <TaskModal
          task={editingTask}
          apartments={apartments}
          onClose={() => setEditingTask(null)}
          onSaved={handleModalSaved}
          onDeleted={handleModalDeleted}
        />
      )}
      <PullToRefresh onRefresh={() => load(showAll)}>
        <div className="pb-nav safe-top" style={{ minHeight: '100%' }}>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-text-main">Incidents & Travaux</h1>
            <button
              onClick={() => setShowAll(v => !v)}
              className="text-xs px-3 py-1.5 border border-border rounded-lg text-text-secondary"
            >
              {showAll ? 'Ouverts seulement' : 'Tout afficher'}
            </button>
          </div>

          {loading ? (
            <p className="text-text-muted text-sm text-center py-8">Chargement...</p>
          ) : (
            <>
              {/* Incidents */}
              <p className="text-text-muted text-xs uppercase tracking-wide mb-2">Incidents locataires</p>
              {incidents.length === 0 ? (
                <p className="text-text-muted text-sm mb-4">Aucun incident{showAll ? '' : ' ouvert'}.</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {incidents.map(inc => (
                    <TaskCard key={inc.id} item={inc} onCycle={t => cycleStatus(t, true)} onEdit={() => {}} actionLoading={actionLoading} />
                  ))}
                </div>
              )}

              {/* Travaux */}
              <div className="flex items-center justify-between mb-2">
                <p className="text-text-muted text-xs uppercase tracking-wide">Travaux & entretien</p>
                <button
                  onClick={openCreate}
                  className="text-xs px-2.5 py-1 bg-primary/20 text-primary border border-primary/30 rounded-lg font-semibold"
                >
                  + Nouveau
                </button>
              </div>
              {tasks.length === 0 ? (
                <p className="text-text-muted text-sm">Aucun travail{showAll ? '' : ' en cours'}.</p>
              ) : (
                <div className="space-y-2">
                  {tasks.map(t => (
                    <TaskCard key={t.id} item={t} onCycle={t => cycleStatus(t, false)} onEdit={setEditingTask} actionLoading={actionLoading} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        </div>
      </PullToRefresh>
    </>
  );
}
