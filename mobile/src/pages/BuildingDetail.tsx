import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/landlord';
import PullToRefresh from '../components/PullToRefresh';
import { buildingCardCostsTotal } from '../lib/buildingExpenses';

export default function BuildingDetail() {
  const { id } = useParams<{ id: string }>();
  const [building, setBuilding] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    return api.getBuildings()
      .then((list: any[]) => {
        const b = list.find((b: any) => b.id === id);
        if (b) setBuilding(b);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleDelete = async () => {
    if (!confirm('Supprimer cet immeuble ?')) return;
    setDeleting(true);
    try {
      await api.deleteBuilding(id!);
      navigate('/buildings');
    } catch (e: any) {
      alert(e.message || 'Erreur suppression');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="pb-nav safe-top" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="text-text-muted text-sm">Chargement...</p>
      </div>
    );
  }

  if (!building) {
    return (
      <div className="pb-nav safe-top" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="text-text-muted text-sm">Immeuble introuvable.</p>
      </div>
    );
  }

  const apts = building.apartments ?? [];
  const total = apts.length;
  const occupied = apts.filter((a: any) => a.leases?.length > 0).length;
  const vacant = total - occupied;
  const monthlyIncome = apts.reduce((sum: number, a: any) => {
    const lease = a.leases?.[0];
    return sum + (lease ? lease.rentAmount + lease.chargesAmount : 0);
  }, 0);
  // Chaque poste est mixte : montant plein de l'immeuble s'il le renseigne,
  // sinon somme des valeurs propres de ses appartements pour ce poste.
  const monthlyCosts = buildingCardCostsTotal(building, apts);
  const cashflow = monthlyIncome - monthlyCosts;

  const fullAddress = [building.address, building.complement, building.zipCode && building.city ? `${building.zipCode} ${building.city}` : (building.city || building.zipCode)].filter(Boolean).join(', ');

  return (
    <div className="pb-nav safe-top overflow-y-auto" style={{ height: '100%' }}>
      <PullToRefresh onRefresh={load}>
        <div className="px-4 py-4">
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.25rem' }}>
            <button onClick={() => navigate('/buildings')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', padding: '0 0.5rem 0 0', cursor: 'pointer', lineHeight: 1 }}>←</button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 className="text-text-main font-bold" style={{ fontSize: '1.1rem' }}>🏢 {building.name}</h1>
              {fullAddress && <p className="text-text-muted text-xs" style={{ marginTop: '0.1rem' }}>📍 {fullAddress}</p>}
              {building.company && (
                <p className="text-text-muted text-xs" style={{ marginTop: '0.1rem' }}>🏛️ {building.company.name} ({building.company.type})</p>
              )}
            </div>
            <button
              onClick={() => navigate(`/buildings/${id}/edit`)}
              className="text-primary text-sm font-medium shrink-0 ml-2"
            >
              Modifier
            </button>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
            <StatCard label="Appartements" value={String(total)} color="var(--text-main)" />
            <StatCard label="Occupés" value={String(occupied)} color="#22c55e" />
            <StatCard label="Vacants" value={String(vacant)} color={vacant > 0 ? '#ef4444' : 'var(--text-muted)'} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <StatCard label="Loyers/mois" value={monthlyIncome > 0 ? `${monthlyIncome.toFixed(0)} €` : '—'} color="#3b82f6" />
            <StatCard label="Charges/mois" value={monthlyCosts > 0 ? `${monthlyCosts.toFixed(0)} €` : '—'} color="#f59e0b" />
            <StatCard label="Cashflow net" value={monthlyIncome > 0 || monthlyCosts > 0 ? `${cashflow.toFixed(0)} €` : '—'} color={cashflow >= 0 ? '#22c55e' : '#ef4444'} />
          </div>

          {/* Apartments list */}
          {total > 0 && (
            <div>
              <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Appartements</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {apts.map((apt: any) => {
                  const lease = apt.leases?.[0];
                  const tenant = lease?.tenant;
                  return (
                    <button
                      key={apt.id}
                      onClick={() => navigate(`/apartments/${apt.id}`)}
                      className="w-full bg-surface rounded-xl border border-border text-left active:opacity-80"
                      style={{ padding: '0.75rem 1rem' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p className="text-text-main font-medium text-sm">{apt.name || apt.address}</p>
                          {tenant ? (
                            <p className="text-text-secondary text-xs" style={{ marginTop: '0.1rem' }}>👤 {tenant.firstName} {tenant.lastName}</p>
                          ) : (
                            <p className="text-text-muted text-xs" style={{ marginTop: '0.1rem' }}>Vacant</p>
                          )}
                        </div>
                        <span style={{
                          display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: '20px',
                          fontSize: '0.7rem', fontWeight: 600,
                          background: lease ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                          color: lease ? '#22c55e' : '#ef4444',
                        }}>
                          {lease ? 'Loué' : 'Vacant'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {total === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <p className="text-sm">Aucun appartement rattaché à cet immeuble.</p>
            </div>
          )}

          <div style={{ marginTop: '1.5rem' }}>
            <button onClick={handleDelete} disabled={deleting}
              className="w-full text-sm text-red-400 border border-red-400/30 py-2.5 rounded-xl disabled:opacity-50">
              {deleting ? 'Suppression...' : 'Supprimer l\'immeuble'}
            </button>
          </div>
        </div>
      </PullToRefresh>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.6rem 0.5rem', textAlign: 'center' }}>
      <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.15rem' }}>{label}</p>
      <p style={{ fontSize: '0.95rem', fontWeight: 700, color }}>{value}</p>
    </div>
  );
}
