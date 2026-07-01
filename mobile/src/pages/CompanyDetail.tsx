import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/landlord';
import PullToRefresh from '../components/PullToRefresh';

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const [company, setCompany] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(() => api.getCompany(id!).then(setCompany), [id]);
  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!confirm('Supprimer cette société ?')) return;
    setDeleting(true);
    try {
      await api.deleteCompany(id!);
      navigate('/companies');
    } catch (e: any) {
      alert(e.message || 'Erreur suppression');
      setDeleting(false);
    }
  };

  if (!company) return <div className="safe-top px-4 py-4 text-text-muted text-sm">Chargement...</div>;

  const apartments = company.apartments ?? [];
  const activeLeases = apartments.flatMap((a: any) => a.leases ?? []).filter((l: any) => l.isActive);

  return (
    <PullToRefresh onRefresh={load}>
      <div className="pb-nav safe-top" style={{ minHeight: '100%' }}>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <button onClick={() => navigate('/companies')} className="text-text-muted text-lg shrink-0">←</button>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-text-main truncate">{company.name}</h1>
                <p className="text-text-muted text-xs">{company.type}</p>
              </div>
            </div>
            <button onClick={() => navigate(`/companies/${id}/edit`)} className="text-primary text-sm font-medium shrink-0 ml-2">Modifier</button>
          </div>

          {/* Info */}
          <div className="bg-surface rounded-xl border border-border p-3 mb-3 space-y-2">
            {company.siret && (
              <div className="flex justify-between">
                <span className="text-text-muted text-xs">SIRET</span>
                <span className="text-text-main text-xs font-mono">{company.siret}</span>
              </div>
            )}
            {company.address && (
              <div className="flex justify-between">
                <span className="text-text-muted text-xs">Adresse</span>
                <span className="text-text-secondary text-xs text-right ml-4">{company.address}</span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-surface rounded-xl border border-border p-3 text-center">
              <p className="text-text-muted text-xs mb-1">Appartements</p>
              <p className="text-text-main font-bold text-2xl">{apartments.length}</p>
            </div>
            <div className="bg-surface rounded-xl border border-border p-3 text-center">
              <p className="text-text-muted text-xs mb-1">Baux actifs</p>
              <p className="font-bold text-2xl" style={{ color: '#22c55e' }}>{activeLeases.length}</p>
            </div>
          </div>

          {/* Apartments list */}
          {apartments.length > 0 && (
            <div className="bg-surface rounded-xl border border-border p-3 mb-3">
              <p className="text-text-muted text-xs uppercase tracking-wide mb-2">Appartements</p>
              {apartments.map((a: any) => {
                const activeLease = (a.leases ?? []).find((l: any) => l.isActive);
                return (
                  <button
                    key={a.id}
                    onClick={() => navigate(`/apartments/${a.id}`)}
                    className="w-full text-left py-2 border-b border-border last:border-0 active:opacity-70 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-text-main text-sm font-medium">{a.name || a.address}</p>
                      {activeLease?.tenant && (
                        <p className="text-text-muted text-xs">👤 {activeLease.tenant.firstName} {activeLease.tenant.lastName}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                        style={{
                          color: activeLease ? '#22c55e' : '#ef4444',
                          background: activeLease ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                        }}>
                        {activeLease ? 'Loué' : 'Vacant'}
                      </span>
                      <span className="text-text-muted text-lg">›</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <button onClick={handleDelete} disabled={deleting}
            className="w-full text-sm text-red-400 border border-red-400/30 py-2.5 rounded-xl disabled:opacity-50">
            {deleting ? 'Suppression...' : 'Supprimer la société'}
          </button>
        </div>
      </div>
    </PullToRefresh>
  );
}
