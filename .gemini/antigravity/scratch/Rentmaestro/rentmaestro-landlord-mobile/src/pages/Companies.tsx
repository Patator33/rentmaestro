import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/landlord';
import PullToRefresh from '../components/PullToRefresh';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

interface Company {
  id: string;
  name: string;
  type: string;
  siret: string | null;
  address: string | null;
  logoUrl: string | null;
  apartmentCount: number;
  activeLeaseCount: number;
}

export default function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const data = await api.getCompanies();
      setCompanies(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load);

  return (
    <PullToRefresh onRefresh={load}>
      <div className="pb-nav safe-top overflow-y-auto" style={{ minHeight: '100%' }}>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button onClick={() => navigate(-1)} className="text-text-muted text-lg">←</button>
              <h1 className="text-xl font-bold text-text-main">Sociétés</h1>
            </div>
            <button onClick={() => navigate('/companies/new')} className="text-primary text-sm font-semibold">+ Nouvelle</button>
          </div>

          {loading ? (
            <p className="text-text-muted text-sm text-center py-8">Chargement...</p>
          ) : companies.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-8">Aucune société.</p>
          ) : (
            <div className="space-y-3">
              {companies.map(c => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/companies/${c.id}`)}
                  className="w-full bg-surface rounded-xl border border-border p-4 text-left active:opacity-80"
                >
                  <div className="flex items-center gap-3 mb-3">
                    {c.logoUrl ? (
                      <img src={c.logoUrl} alt={c.name} style={{ height: 40, maxWidth: 80, objectFit: 'contain', borderRadius: 6 }} />
                    ) : (
                      <span className="text-2xl">🏛️</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-text-main font-semibold text-base leading-tight truncate">{c.name}</p>
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(43,140,238,0.15)', color: '#2b8cee' }}>{c.type}</span>
                    </div>
                    <span className="text-text-muted text-lg shrink-0">›</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-background rounded-lg p-2 text-center">
                      <p className="text-text-muted text-xs">Appartements</p>
                      <p className="text-text-main font-bold text-lg">{c.apartmentCount}</p>
                    </div>
                    <div className="bg-background rounded-lg p-2 text-center">
                      <p className="text-text-muted text-xs">Baux actifs</p>
                      <p className="font-bold text-lg" style={{ color: '#22c55e' }}>{c.activeLeaseCount}</p>
                    </div>
                  </div>
                  {(c.siret || c.address) && (
                    <div className="mt-3 pt-3 border-t border-border space-y-0.5">
                      {c.siret && <p className="text-text-muted text-xs">SIRET : {c.siret}</p>}
                      {c.address && <p className="text-text-muted text-xs">{c.address}</p>}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </PullToRefresh>
  );
}
