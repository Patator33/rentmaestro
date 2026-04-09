import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/landlord';
import PullToRefresh from '../components/PullToRefresh';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

export default function Buildings() {
  const [buildings, setBuildings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    return api.getBuildings()
      .then(setBuildings)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);
  useAutoRefresh(load);

  return (
    <div className="pb-nav safe-top overflow-y-auto" style={{ height: '100%' }}>
      <PullToRefresh onRefresh={load}>
        <div className="px-4 py-4">
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <button onClick={() => navigate('/manage')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', padding: '0 0.5rem 0 0', cursor: 'pointer', lineHeight: 1 }}>←</button>
            <h1 className="text-xl font-bold text-text-main" style={{ flex: 1 }}>🏢 Immeubles</h1>
            <button onClick={() => navigate('/buildings/new')} className="text-primary text-sm font-semibold">+ Nouveau</button>
          </div>

          {loading && <p className="text-text-muted text-sm text-center py-8">Chargement...</p>}

          {!loading && buildings.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏢</p>
              <p className="text-sm">Aucun immeuble</p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {buildings.map((b: any) => {
              const apts = b.apartments ?? [];
              const total = apts.length;
              const occupied = apts.filter((a: any) => a.leases?.length > 0).length;
              const vacant = total - occupied;
              const monthlyIncome = apts.reduce((sum: number, a: any) => {
                const lease = a.leases?.[0];
                return sum + (lease ? lease.rentAmount + lease.chargesAmount : 0);
              }, 0);
              const fullAddress = [b.address, b.complement, b.zipCode && b.city ? `${b.zipCode} ${b.city}` : (b.city || b.zipCode)].filter(Boolean).join(', ');

              return (
                <button
                  key={b.id}
                  onClick={() => navigate(`/buildings/${b.id}`)}
                  className="w-full bg-surface rounded-xl border border-border text-left active:opacity-80"
                  style={{ padding: '1rem' }}
                >
                  <div style={{ marginBottom: '0.6rem' }}>
                    <p className="text-text-main font-semibold text-sm">🏢 {b.name}</p>
                    {fullAddress && <p className="text-text-muted text-xs" style={{ marginTop: '0.15rem' }}>📍 {fullAddress}</p>}
                    {b.company && <p className="text-text-muted text-xs" style={{ marginTop: '0.1rem' }}>🏢 {b.company.name}</p>}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                    <StatBadge label="Appts" value={String(total)} color="var(--text-main)" />
                    <StatBadge label="Occupés" value={String(occupied)} color="#22c55e" />
                    <StatBadge label="Vacants" value={String(vacant)} color={vacant > 0 ? '#ef4444' : 'var(--text-muted)'} />
                  </div>

                  {monthlyIncome > 0 && (
                    <p className="text-text-secondary text-xs" style={{ marginTop: '0.5rem', textAlign: 'right' }}>
                      💶 {monthlyIncome.toFixed(0)} €/mois
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </PullToRefresh>
    </div>
  );
}

function StatBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: 'var(--surface-active)', borderRadius: '8px', padding: '0.35rem 0.5rem', textAlign: 'center' }}>
      <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.1rem' }}>{label}</p>
      <p style={{ fontSize: '0.95rem', fontWeight: 700, color }}>{value}</p>
    </div>
  );
}
