import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/landlord';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

function leaseStatus(l: any): 'future' | 'active' | 'past' {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(l.startDate);
  const end = l.endDate ? new Date(l.endDate) : null;
  if (start > today) return 'future';
  if (!end || end >= today) return 'active';
  return 'past';
}

export default function Leases() {
  const [leases, setLeases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(() => {
    api.getLeases().then(setLeases).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load);

  const future = leases.filter(l => leaseStatus(l) === 'future');
  const active = leases.filter(l => leaseStatus(l) === 'active');
  const past   = leases.filter(l => leaseStatus(l) === 'past');

  const renderCard = (l: any, dimmed = false) => (
    <button
      key={l.id}
      onClick={() => navigate(`/leases/${l.id}`)}
      className="w-full bg-surface rounded-xl border border-border p-3 text-left active:opacity-80"
      style={dimmed ? { opacity: 0.5 } : undefined}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-text-main font-medium text-sm">{l.tenant?.firstName} {l.tenant?.lastName}</p>
          <p className="text-text-muted text-xs">{l.apartment?.name || l.apartment?.address}</p>
          <p className="text-text-muted text-xs">
            {new Date(l.startDate).toLocaleDateString('fr-FR')} — {l.endDate ? new Date(l.endDate).toLocaleDateString('fr-FR') : 'en cours'}
          </p>
        </div>
        <p className="text-text-main text-sm font-semibold">{(l.rentAmount + l.chargesAmount).toFixed(0)} €</p>
      </div>
    </button>
  );

  return (
    <div className="pb-nav safe-top overflow-y-auto" style={{ height: '100%' }}>
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/manage')} className="text-text-muted text-lg">←</button>
            <h1 className="text-xl font-bold text-text-main">Baux</h1>
          </div>
          <button onClick={() => navigate('/leases/new')} className="bg-primary text-white text-sm px-3 py-1.5 rounded-lg font-medium">+ Nouveau</button>
        </div>

        {loading ? (
          <p className="text-text-muted text-sm text-center py-8">Chargement...</p>
        ) : (
          <>
            {future.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2 px-1" style={{ color: '#f59e0b' }}>À venir</p>
                <div className="space-y-2">{future.map(l => renderCard(l))}</div>
              </div>
            )}

            {active.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: '#22c55e' }}>En cours</p>
                <div className="space-y-2">{active.map(l => renderCard(l))}</div>
              </div>
            )}

            {past.length > 0 && (
              <div className="mb-5">
                <p className="text-text-muted text-xs font-semibold uppercase tracking-wide mb-2 px-1">Terminés</p>
                <div className="space-y-2">{past.map(l => renderCard(l, true))}</div>
              </div>
            )}

            {leases.length === 0 && (
              <p className="text-text-muted text-sm text-center py-8">Aucun bail enregistré.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
