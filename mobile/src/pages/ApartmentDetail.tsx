import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/landlord';
import PullToRefresh from '../components/PullToRefresh';
import TaskDetailPopup, { type TaskForPopup } from '../components/TaskDetailPopup';

type Tab = 'infos' | 'payments' | 'tasks';

const TASK_STATUS: Record<string, { label: string; color: string }> = {
  TODO:        { label: 'À faire', color: '#f59e0b' },
  IN_PROGRESS: { label: 'En cours', color: '#3b82f6' },
  DONE:        { label: 'Fait', color: '#22c55e' },
};

const PAYMENT_LABELS: Record<string, { label: string; color: string }> = {
  PAID:    { label: 'Payé', color: '#22c55e' },
  PENDING: { label: 'En attente', color: '#f59e0b' },
  LATE:    { label: 'En retard', color: '#ef4444' },
  PARTIAL: { label: 'Partiel', color: '#f59e0b' },
};

export default function ApartmentDetail() {
  const { id } = useParams<{ id: string }>();
  const [apt, setApt] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('infos');
  const [deleting, setDeleting] = useState(false);
  const [detailTask, setDetailTask] = useState<TaskForPopup | null>(null);
  const navigate = useNavigate();

  const load = useCallback(() => api.getApartment(id!).then(setApt), [id]);
  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!confirm('Supprimer cet appartement ? Cette action est irréversible.')) return;
    setDeleting(true);
    try {
      await api.deleteApartment(id!);
      navigate('/apartments');
    } catch (e: any) {
      alert(e.message || 'Erreur suppression');
      setDeleting(false);
    }
  };

  if (!apt) return <div className="safe-top px-4 py-4 text-text-muted text-sm">Chargement...</div>;

  // Build TaskForPopup from apartment task (inject apartment info)
  const toTaskForPopup = (t: any): TaskForPopup => ({
    id: t.id,
    title: t.title,
    description: t.description ?? null,
    status: t.status,
    cost: t.cost ?? null,
    dueDate: t.dueDate ?? null,
    createdAt: t.createdAt,
    apartment: { id: apt.id, address: apt.address, name: apt.name ?? null },
  });

  const cc = apt.rent + apt.charges;
  const costs = (apt.mortgageAmount || 0) + (apt.insuranceAmount || 0) + (apt.taxAmount || 0);
  const cashflow = cc - costs;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const activeLease = apt.leases?.find((l: any) => {
    const start = new Date(l.startDate);
    const end = l.endDate ? new Date(l.endDate) : null;
    return start <= today && (!end || end >= today);
  });
  const upcomingLeases = apt.leases?.filter((l: any) => new Date(l.startDate) > today) ?? [];
  const pastLeases = apt.leases?.filter((l: any) => l.endDate && new Date(l.endDate) < today) ?? [];

  const allPayments = (apt.leases ?? []).flatMap((l: any) =>
    (l.payments ?? []).map((p: any) => ({ ...p, tenantName: `${l.tenant?.firstName ?? ''} ${l.tenant?.lastName ?? ''}`.trim() }))
  ).sort((a: any, b: any) => new Date(b.period).getTime() - new Date(a.period).getTime());

  const tasks = apt.tasks ?? [];

  return (
    <>
    {detailTask && (
      <TaskDetailPopup task={detailTask} onClose={() => setDetailTask(null)} />
    )}
    <PullToRefresh onRefresh={load}>
      <div className="pb-nav safe-top" style={{ minHeight: '100%' }}>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('/apartments')} className="text-text-muted text-lg">←</button>
              <h1 className="text-xl font-bold text-text-main">{apt.name || apt.address}</h1>
            </div>
            <button onClick={() => navigate(`/apartments/${id}/edit`)} className="text-primary text-sm font-medium">Modifier</button>
          </div>

          {/* Tab nav */}
          <div className="flex gap-1 mb-4 bg-surface rounded-xl border border-border p-1">
            {(['infos', 'payments', 'tasks'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 text-xs py-1.5 rounded-lg font-medium"
                style={{
                  background: tab === t ? 'var(--primary)' : 'transparent',
                  color: tab === t ? '#fff' : 'var(--text-muted)',
                }}
              >
                {t === 'infos' ? 'Infos' : t === 'payments' ? 'Loyers' : 'Travaux'}
              </button>
            ))}
          </div>

          {tab === 'infos' && (
            <>
              <div className="bg-surface rounded-xl border border-border p-3 mb-3">
                <p className="text-text-muted text-xs uppercase tracking-wide mb-2">Adresse</p>
                <p className="text-text-main text-sm">{apt.address}{apt.complement ? `, ${apt.complement}` : ''}</p>
                <p className="text-text-secondary text-xs mt-0.5">{apt.zipCode} {apt.city}</p>
                {apt.building && (
                  <button onClick={() => navigate(`/buildings/${apt.building.id}`)} className="mt-1.5 flex items-center gap-1 active:opacity-70">
                    <span className="text-xs">🏢</span>
                    <span className="text-primary text-xs font-medium">{apt.building.name}</span>
                  </button>
                )}
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #2a3045', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>
                    {apt.surface != null ? `${apt.surface} m²` : '— m²'}
                  </span>
                  {apt.dpe ? (
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 12, padding: '2px 8px', borderRadius: 4, background: ({ A:'#22c55e', B:'#84cc16', C:'#a3e635', D:'#facc15', E:'#fb923c', F:'#f87171', G:'#ef4444' } as Record<string,string>)[apt.dpe] ?? '#6b7280' }}>
                      DPE {apt.dpe}
                    </span>
                  ) : (
                    <span style={{ color: '#64748b', fontSize: 12 }}>DPE —</span>
                  )}
                </div>
              </div>

              <div className="bg-surface rounded-xl border border-border p-3 mb-3">
                <p className="text-text-muted text-xs uppercase tracking-wide mb-3">Finances</p>
                <div className="space-y-2">
                  <Row label="Loyer HC" value={`${apt.rent.toFixed(2)} €`} />
                  <Row label="Charges" value={`${apt.charges.toFixed(2)} €`} />
                  <div className="border-t border-border pt-2">
                    <Row label="Loyer CC" value={`${cc.toFixed(2)} €`} bold />
                  </div>
                  {apt.defaultDeposit != null && <Row label="Caution par défaut" value={`${Number(apt.defaultDeposit).toFixed(2)} €`} />}
                  {apt.mortgageAmount != null && <Row label="Mensualité crédit" value={`${Number(apt.mortgageAmount).toFixed(2)} €`} />}
                  {apt.insuranceAmount != null && <Row label="Assurance PNO" value={`${Number(apt.insuranceAmount).toFixed(2)} €`} />}
                  {apt.taxAmount != null && <Row label="Taxe foncière (mens.)" value={`${Number(apt.taxAmount).toFixed(2)} €`} />}
                  {costs > 0 && (
                    <div className="border-t border-border pt-2">
                      <Row label="Cashflow mensuel" value={`${cashflow >= 0 ? '+' : ''}${cashflow.toFixed(2)} €`}
                        color={cashflow >= 0 ? 'text-paid' : 'text-late'} bold />
                    </div>
                  )}
                </div>
              </div>

              {apt.description && (
                <div className="bg-surface rounded-xl border border-border p-3 mb-3">
                  <p className="text-text-muted text-xs uppercase tracking-wide mb-1">Description</p>
                  <p className="text-text-secondary text-sm leading-relaxed">{apt.description}</p>
                </div>
              )}

              {activeLease && (
                <div className="bg-surface rounded-xl border border-border p-3 mb-3">
                  <p className="text-text-muted text-xs uppercase tracking-wide mb-2">Bail en cours</p>
                  <LeaseRow lease={activeLease} navigate={navigate} />
                </div>
              )}

              {upcomingLeases.length > 0 && (
                <div className="bg-surface rounded-xl border border-border p-3 mb-3">
                  <p className="text-text-muted text-xs uppercase tracking-wide mb-2">À venir</p>
                  {upcomingLeases.map((l: any) => <LeaseRow key={l.id} lease={l} navigate={navigate} />)}
                </div>
              )}

              {!activeLease && upcomingLeases.length === 0 && (
                <div className="bg-surface rounded-xl border border-border p-3 mb-3 text-center">
                  <p className="text-text-muted text-sm py-1">Appartement vacant</p>
                </div>
              )}

              {pastLeases.length > 0 && (
                <div className="bg-surface rounded-xl border border-border p-3 mb-3" style={{ opacity: 0.65 }}>
                  <p className="text-text-muted text-xs uppercase tracking-wide mb-2">Historique</p>
                  {pastLeases.map((l: any) => <LeaseRow key={l.id} lease={l} navigate={navigate} />)}
                </div>
              )}

              <button onClick={handleDelete} disabled={deleting}
                className="w-full text-sm text-red-400 border border-red-400/30 py-2.5 rounded-xl disabled:opacity-50">
                {deleting ? 'Suppression...' : 'Supprimer l\'appartement'}
              </button>
            </>
          )}

          {tab === 'payments' && (
            <div className="bg-surface rounded-xl border border-border p-3">
              {allPayments.length === 0 ? (
                <p className="text-text-muted text-xs text-center py-4">Aucun paiement</p>
              ) : (
                allPayments.map((p: any) => {
                  const period = new Date(p.period).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
                  const info = PAYMENT_LABELS[p.status] ?? { label: p.status, color: '#6b7280' };
                  return (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="text-text-secondary text-xs capitalize">{period}</p>
                        {p.tenantName && <p className="text-text-muted text-xs">{p.tenantName}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-text-main text-xs font-medium">{p.amount.toFixed(2)} €</span>
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ color: info.color, background: `${info.color}20` }}>
                          {info.label}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === 'tasks' && (
            <div className="space-y-2">
              {tasks.length === 0 ? (
                <div className="bg-surface rounded-xl border border-border p-3 text-center">
                  <p className="text-text-muted text-xs py-4">Aucun travail planifié</p>
                </div>
              ) : (
                tasks.map((t: any) => {
                  const s = TASK_STATUS[t.status] ?? { label: t.status, color: '#6b7280' };
                  return (
                    <div
                      key={t.id}
                      className="bg-surface rounded-xl border border-border p-3 active:opacity-70"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setDetailTask(toTaskForPopup(t))}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-text-main text-sm font-medium">{t.title}</p>
                          {t.description && <p className="text-text-muted text-xs mt-0.5">{t.description}</p>}
                          {t.dueDate && <p className="text-text-muted text-xs mt-0.5">📅 {new Date(t.dueDate).toLocaleDateString('fr-FR')}</p>}
                          {t.cost != null && <p className="text-text-secondary text-xs mt-0.5">{Number(t.cost).toFixed(2)} €</p>}
                        </div>
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full ml-2 shrink-0"
                          style={{ color: s.color, background: `${s.color}20` }}>
                          {s.label}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </PullToRefresh>
    </>
  );
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-muted text-xs">{label}</span>
      <span className={`text-xs font-${bold ? 'bold' : 'medium'} ${color ?? 'text-text-main'}`}>{value}</span>
    </div>
  );
}

function LeaseRow({ lease, navigate }: { lease: any; navigate: (p: string) => void }) {
  return (
    <button
      onClick={() => navigate(`/leases/${lease.id}`)}
      className="w-full text-left py-2 border-b border-border last:border-0 active:opacity-70 flex items-center justify-between"
    >
      <div>
        <p className="text-text-main text-sm font-medium">{lease.tenant?.firstName} {lease.tenant?.lastName}</p>
        <p className="text-text-muted text-xs">
          {new Date(lease.startDate).toLocaleDateString('fr-FR')} — {lease.endDate ? new Date(lease.endDate).toLocaleDateString('fr-FR') : 'en cours'}
        </p>
      </div>
      <span className="text-text-muted text-lg ml-2">›</span>
    </button>
  );
}
