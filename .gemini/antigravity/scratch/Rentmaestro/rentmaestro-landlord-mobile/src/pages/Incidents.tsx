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
  apartment: { address: string; name: string | null };
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

function TaskCard({ item, onCycle, actionLoading }: { item: Task; onCycle: (t: Task) => void; actionLoading: string | null }) {
  return (
    <div className="bg-surface rounded-xl border border-border p-3">
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
            onClick={() => onCycle(item)}
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

  return (
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
                  <TaskCard key={inc.id} item={inc} onCycle={t => cycleStatus(t, true)} actionLoading={actionLoading} />
                ))}
              </div>
            )}

            {/* Travaux */}
            <p className="text-text-muted text-xs uppercase tracking-wide mb-2">Travaux & entretien</p>
            {tasks.length === 0 ? (
              <p className="text-text-muted text-sm">Aucun travail{showAll ? '' : ' en cours'}.</p>
            ) : (
              <div className="space-y-2">
                {tasks.map(t => (
                  <TaskCard key={t.id} item={t} onCycle={t => cycleStatus(t, false)} actionLoading={actionLoading} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
      </div>
    </PullToRefresh>
  );
}
