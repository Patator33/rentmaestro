import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/landlord';
import { clearAuth } from '../lib/storage';
import PullToRefresh from '../components/PullToRefresh';
import GlobalSearch from '../components/GlobalSearch';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

interface RentReview {
  leaseId: string;
  tenantName: string;
  apartmentName: string;
  startDate: string;
}

interface PartialPayment {
  paymentId: string;
  amount: number;
  paidAmount: number | null;
  remaining: number;
  leaseId: string;
  tenant: { id: string; firstName: string; lastName: string };
  apartment: { address: string; name: string | null };
}

interface IncompleteGed {
  leaseId: string;
  tenantName: string;
  apartmentName: string;
  missing: string[];
}

interface DashboardData {
  pendingRents: number;
  monthRevenue: number;
  pendingAmount: number;
  openIncidents: number;
  openTasks: number;
  unreadMessages: number;
  activeLeases: number;
  apartmentCount: number;
  occupancyRate: number;
  currentMonth: string;
  rentReviews: RentReview[];
  incompleteGed: IncompleteGed[];
  partialPayments: PartialPayment[];
  unpaidThisMonth: Array<{
    paymentId: string;
    amount: number;
    status: string;
    leaseId: string;
    period: string;
    tenant: { id: string; firstName: string; lastName: string };
    apartment: { address: string; name: string | null };
  }>;
}

type EventType = 'LEASE_END' | 'RENT_REVIEW' | 'TASK_DUE' | 'LEASE_START';
type Urgency = 'low' | 'medium' | 'high';

interface AgendaEvent {
  type: EventType;
  label: string;
  sublabel?: string;
  date: string;
  daysUntil: number;
  urgency: Urgency;
  leaseId?: string;
}

interface AgendaData {
  grouped: Record<string, AgendaEvent[]>;
  total: number;
}

const TYPE_CONFIG: Record<EventType, { icon: string; color: string; bg: string }> = {
  LEASE_END:   { icon: '📤', color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
  RENT_REVIEW: { icon: '📈', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  TASK_DUE:    { icon: '🔧', color: '#fb923c', bg: 'rgba(251,146,60,0.08)' },
  LEASE_START: { icon: '📥', color: '#2b8cee', bg: 'rgba(43,140,238,0.08)' },
};

const URGENCY_BORDER: Record<Urgency, string> = {
  high:   '2px solid #ef4444',
  medium: '2px solid #f59e0b',
  low:    '1px solid rgba(255,255,255,0.1)',
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [agenda, setAgenda] = useState<AgendaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [remindModal, setRemindModal] = useState<DashboardData['unpaidThisMonth'][0] | null>(null);
  const [remindLoading, setRemindLoading] = useState(false);
  const [remindMsg, setRemindMsg] = useState('');
  const [sentReviews, setSentReviews] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setError('');
    try {
      const [d, a] = await Promise.all([api.dashboard(), api.getAgenda()]);
      setData(d); setAgenda(a);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load);

  const handleLogout = async () => {
    await clearAuth();
    navigate('/login', { replace: true });
  };

  const handleSendReminder = async () => {
    if (!remindModal) return;
    setRemindLoading(true); setRemindMsg('');
    try {
      await api.sendReminder(remindModal.leaseId, remindModal.period);
      setRemindMsg('✓ Relance envoyée');
      setTimeout(() => setRemindModal(null), 1500);
    } catch (e: any) {
      setRemindMsg(`Erreur : ${e.message}`);
    } finally {
      setRemindLoading(false);
    }
  };

  const monthLabel = data?.currentMonth
    ? new Date(data.currentMonth + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : '';

  return (
    <>
    <PullToRefresh onRefresh={load}>
      <div className="pb-nav safe-top" style={{ minHeight: '100%' }}>
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-text-main">Tableau de bord</h1>
            <p className="text-text-muted text-xs">{monthLabel}</p>
          </div>
          <button onClick={handleLogout} className="text-text-muted text-xs px-3 py-1.5 border border-border rounded-lg">
            Déconnexion
          </button>
        </div>
        <GlobalSearch />

        {loading ? (
          <p className="text-text-muted text-sm text-center py-8">Chargement...</p>
        ) : error ? (
          <p className="text-red-400 text-sm text-center py-8 break-all">{error}</p>
        ) : data && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <KpiCard label="Loyers en attente" value={data.pendingRents} sub={`${data.pendingAmount.toFixed(0)} €`} color="text-pending" onClick={() => navigate('/rents')} />
              <KpiCard label="Revenus encaissés" value={`${data.monthRevenue.toFixed(0)} €`} sub="ce mois" color="text-paid" />
              <KpiCard label="Incidents & Travaux" value={(data.openIncidents ?? 0) + (data.openTasks ?? 0)} sub="ouverts" color="text-late" onClick={() => navigate('/incidents')} />
              <KpiCard label="Messages non lus" value={data.unreadMessages} sub="locataires" color="text-primary" onClick={() => navigate('/messages')} />
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <KpiCard label="Baux actifs" value={data.activeLeases} sub="en cours" color="text-text-main" onClick={() => navigate('/leases')} />
              <KpiCard label="Appartements" value={data.apartmentCount ?? 0} sub="total" color="text-text-main" />
              <KpiCard label="Occupation" value={`${data.occupancyRate ?? 0}%`} sub="taux" color={(data.occupancyRate ?? 0) >= 80 ? 'text-paid' : 'text-pending'} />
            </div>

            {data.unpaidThisMonth.length > 0 && (
              <div className="rounded-xl p-3 mb-3" style={{ background: 'rgba(239,68,68,0.06)', border: '2px solid #ef4444' }}>
                <p className="text-xs uppercase tracking-wide mb-2 font-semibold" style={{ color: '#ef4444' }}>Loyers impayés ce mois</p>
                {data.unpaidThisMonth.map(p => (
                  <div
                    key={p.paymentId}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0 active:opacity-70"
                    style={{ cursor: 'pointer' }}
                    onClick={() => { setRemindModal(p); setRemindMsg(''); }}
                  >
                    <div>
                      <p className="text-text-main text-sm font-medium">{p.tenant.firstName} {p.tenant.lastName}</p>
                      <p className="text-text-muted text-xs">{p.apartment.name || p.apartment.address}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-text-main text-sm font-semibold">{p.amount.toFixed(2)} €</p>
                      <p className={`text-xs ${p.status === 'LATE' ? 'text-late' : 'text-pending'}`}>{p.status === 'LATE' ? 'En retard' : 'En attente'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {data.partialPayments?.length > 0 && (
              <div className="rounded-xl p-3 mb-3" style={{ background: 'rgba(245,158,11,0.08)', border: '2px solid #f59e0b' }}>
                <p className="text-xs uppercase tracking-wide mb-2 font-semibold" style={{ color: '#f59e0b' }}>💰 Paiements partiels ce mois</p>
                {data.partialPayments.map(p => (
                  <div key={p.paymentId} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-text-main text-sm font-medium">{p.tenant.firstName} {p.tenant.lastName}</p>
                      <p className="text-text-muted text-xs">{p.apartment.name || p.apartment.address}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold" style={{ color: '#f59e0b' }}>Reçu {p.paidAmount?.toFixed(2)} €</p>
                      <p className="text-xs" style={{ color: '#f59e0b' }}>Solde {p.remaining.toFixed(2)} €</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {data.incompleteGed?.length > 0 && (
              <div className="rounded-xl p-3 mb-3" style={{ background: 'rgba(245,158,11,0.08)', border: '2px solid #f59e0b' }}>
                <p className="text-xs uppercase tracking-wide mb-2 font-semibold" style={{ color: '#f59e0b' }}>📎 GED incomplète ({data.incompleteGed.length} bail{data.incompleteGed.length > 1 ? 's' : ''})</p>
                {data.incompleteGed.map(g => (
                  <div
                    key={g.leaseId}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0 active:opacity-70"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/leases/${g.leaseId}`)}
                  >
                    <div>
                      <p className="text-text-main text-sm font-medium">{g.tenantName}</p>
                      <p className="text-text-muted text-xs">{g.apartmentName}</p>
                    </div>
                    <p className="text-xs font-semibold" style={{ color: '#f59e0b' }}>Manquant : {g.missing.join(' + ')}</p>
                  </div>
                ))}
              </div>
            )}

            {data.rentReviews?.filter(r => !sentReviews.has(r.leaseId)).length > 0 && (
              <div className="rounded-xl p-3 mb-3" style={{ background: 'rgba(34,197,94,0.08)', border: '2px solid #22c55e' }}>
                <p className="text-xs uppercase tracking-wide mb-2 font-semibold" style={{ color: '#22c55e' }}>📈 Révisions de loyer à prévoir</p>
                {data.rentReviews.filter(r => !sentReviews.has(r.leaseId)).map(r => (
                  <div
                    key={r.leaseId}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0 active:opacity-70"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/leases/${r.leaseId}/edit`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-text-main text-sm font-medium">{r.tenantName}</p>
                      <p className="text-text-muted text-xs">{r.apartmentName}</p>
                      <p className="text-text-secondary text-xs">depuis {new Date(r.startDate).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</p>
                    </div>
                    <button
                      onClick={async e => {
                        e.stopPropagation();
                        try { await api.markRentReviewSent(r.leaseId); } catch {}
                        setSentReviews(prev => new Set([...prev, r.leaseId]));
                      }}
                      className="ml-3 shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg"
                      style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid #22c55e' }}
                    >
                      ✓ Envoyé
                    </button>
                  </div>
                ))}
              </div>
            )}

            {agenda && agenda.total > 0 && (
              <div className="mb-3">
                <p className="text-text-muted text-xs uppercase tracking-wide mb-3">Agenda & Échéancier — 6 prochains mois</p>
                {Object.entries(agenda.grouped).map(([month, events]) => (
                  <div key={month} className="mb-4">
                    <p className="text-text-muted text-xs font-semibold uppercase tracking-wide mb-2 pb-1 border-b border-border capitalize">{month}</p>
                    <div className="space-y-2">
                      {events.map((ev, i) => {
                        const cfg = TYPE_CONFIG[ev.type];
                        const dateStr = new Date(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                        return (
                          <div
                            key={i}
                            className={`flex items-center gap-3 rounded-xl p-3${ev.leaseId ? ' active:opacity-70' : ''}`}
                            style={{ background: cfg.bg, border: ev.type === 'RENT_REVIEW' ? `2px solid ${TYPE_CONFIG.RENT_REVIEW.color}` : URGENCY_BORDER[ev.urgency], cursor: ev.leaseId ? 'pointer' : undefined, ...(ev.type === 'RENT_REVIEW' ? { boxShadow: '0 0 14px rgba(34,197,94,0.45)' } : {}) }}
                            onClick={() => ev.leaseId && navigate(`/leases/${ev.leaseId}/edit`)}
                          >
                            <div className="text-center shrink-0 w-10">
                              <div className="text-xl">{cfg.icon}</div>
                              <div className="text-xs font-bold" style={{ color: cfg.color }}>{dateStr}</div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-text-main text-sm font-semibold leading-tight">{ev.label}</p>
                              {ev.sublabel && <p className="text-text-secondary text-xs mt-0.5 truncate">{ev.sublabel}</p>}
                            </div>
                            <div className="shrink-0 text-right flex items-center gap-1">
                              <p className={`text-xs font-semibold ${ev.daysUntil < 0 ? 'text-late' : ev.daysUntil === 0 ? 'text-paid' : ev.daysUntil <= 30 ? 'text-pending' : 'text-text-muted'}`}>
                                {ev.daysUntil < 0 ? 'En retard' : ev.daysUntil === 0 ? "Aujourd'hui" : `J−${ev.daysUntil}`}
                              </p>
                              {ev.leaseId && <span className="text-text-muted text-sm">›</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {agenda && agenda.total === 0 && (
              <div className="bg-surface rounded-xl border border-border p-3 mb-3">
                <p className="text-text-muted text-xs uppercase tracking-wide mb-1">Agenda & Échéancier</p>
                <p className="text-text-muted text-sm">Aucun événement dans les 6 prochains mois.</p>
              </div>
            )}
          </>
        )}
      </div>
      </div>
    </PullToRefresh>

    {/* Reminder modal */}
    {remindModal && (
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', zIndex: 50 }}
        onClick={e => e.target === e.currentTarget && setRemindModal(null)}
      >
        <div style={{ background: '#1e293b', borderRadius: '20px 20px 0 0', padding: '1.5rem', paddingBottom: 'calc(1.5rem + 72px)', width: '100%' }}>
          <h3 className="text-text-main font-bold text-base mb-1">Envoyer une relance</h3>
          <p className="text-text-muted text-sm mb-4">
            {remindModal.tenant.firstName} {remindModal.tenant.lastName} — {remindModal.amount.toFixed(2)} €
          </p>
          {remindMsg ? (
            <p className={`text-sm text-center mb-4 ${remindMsg.startsWith('✓') ? 'text-paid' : 'text-late'}`}>{remindMsg}</p>
          ) : (
            <p className="text-text-secondary text-sm mb-4">Un email de rappel de loyer sera envoyé au locataire.</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => setRemindModal(null)}
              className="flex-1 py-3 rounded-xl border border-border text-text-secondary text-sm"
            >
              Annuler
            </button>
            <button
              onClick={handleSendReminder}
              disabled={remindLoading || !!remindMsg.startsWith('✓')}
              className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold text-sm disabled:opacity-50"
            >
              {remindLoading ? 'Envoi...' : '✉ Envoyer'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function KpiCard({ label, value, sub, color, onClick }: { label: string; value: string | number; sub: string; color: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`bg-surface rounded-xl border border-border p-3 ${onClick ? 'cursor-pointer active:opacity-80' : ''}`}
    >
      <p className="text-text-muted text-xs uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-text-muted text-xs mt-0.5">{sub}</p>
    </div>
  );
}
