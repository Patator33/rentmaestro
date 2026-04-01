import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/landlord';
import PullToRefresh from '../components/PullToRefresh';

export default function ApartmentDetail() {
  const { id } = useParams<{ id: string }>();
  const [apt, setApt] = useState<any>(null);
  const navigate = useNavigate();

  const load = useCallback(() => api.getApartment(id!).then(setApt), [id]);
  useEffect(() => { load(); }, [load]);

  if (!apt) return <div className="safe-top px-4 py-4 text-text-muted text-sm">Chargement...</div>;

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

  return (
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

          {/* Adresse */}
          <div className="bg-surface rounded-xl border border-border p-3 mb-3">
            <p className="text-text-muted text-xs uppercase tracking-wide mb-2">Adresse</p>
            <p className="text-text-main text-sm">{apt.address}{apt.complement ? `, ${apt.complement}` : ''}</p>
            <p className="text-text-secondary text-xs mt-0.5">{apt.zipCode} {apt.city}</p>
          </div>

          {/* Finances */}
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
                  <Row
                    label="Cashflow mensuel"
                    value={`${cashflow >= 0 ? '+' : ''}${cashflow.toFixed(2)} €`}
                    color={cashflow >= 0 ? 'text-paid' : 'text-late'}
                    bold
                  />
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {apt.description && (
            <div className="bg-surface rounded-xl border border-border p-3 mb-3">
              <p className="text-text-muted text-xs uppercase tracking-wide mb-1">Description</p>
              <p className="text-text-secondary text-sm leading-relaxed">{apt.description}</p>
            </div>
          )}

          {/* Bail en cours */}
          {activeLease && (
            <div className="bg-surface rounded-xl border border-border p-3 mb-3">
              <p className="text-text-muted text-xs uppercase tracking-wide mb-2">Bail en cours</p>
              <LeaseRow lease={activeLease} navigate={navigate} />
            </div>
          )}

          {/* Baux à venir */}
          {upcomingLeases.length > 0 && (
            <div className="bg-surface rounded-xl border border-border p-3 mb-3">
              <p className="text-text-muted text-xs uppercase tracking-wide mb-2">À venir</p>
              {upcomingLeases.map((l: any) => <LeaseRow key={l.id} lease={l} navigate={navigate} />)}
            </div>
          )}

          {/* Vacant */}
          {!activeLease && upcomingLeases.length === 0 && (
            <div className="bg-surface rounded-xl border border-border p-3 mb-3 text-center">
              <p className="text-text-muted text-sm py-1">Appartement vacant</p>
            </div>
          )}

          {/* Historique */}
          {pastLeases.length > 0 && (
            <div className="bg-surface rounded-xl border border-border p-3 mb-3" style={{ opacity: 0.65 }}>
              <p className="text-text-muted text-xs uppercase tracking-wide mb-2">Historique</p>
              {pastLeases.map((l: any) => <LeaseRow key={l.id} lease={l} navigate={navigate} />)}
            </div>
          )}
        </div>
      </div>
    </PullToRefresh>
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
