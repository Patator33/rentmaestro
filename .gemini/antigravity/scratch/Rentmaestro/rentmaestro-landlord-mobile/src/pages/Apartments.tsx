import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/landlord';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

export default function Apartments() {
  const [apts, setApts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(() => {
    api.getApartments().then(setApts).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load);

  return (
    <div className="pb-nav safe-top overflow-y-auto" style={{ height: '100%' }}>
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/manage')} className="text-text-muted text-lg">←</button>
            <h1 className="text-xl font-bold text-text-main">Appartements</h1>
          </div>
          <button onClick={() => navigate('/apartments/new')} className="bg-primary text-white text-sm px-3 py-1.5 rounded-lg font-medium">+ Nouveau</button>
        </div>

        {loading ? (
          <p className="text-text-muted text-sm text-center py-8">Chargement...</p>
        ) : (
          <div className="space-y-2">
            {apts.map((a: any) => (
              <button
                key={a.id}
                onClick={() => navigate(`/apartments/${a.id}`)}
                className="w-full bg-surface rounded-xl border border-border p-3 text-left active:opacity-80"
              >
                <p className="text-text-main font-medium text-sm">{a.name || a.address}</p>
                <p className="text-text-muted text-xs">{a.city} {a.zipCode}</p>
                {a.leases[0] ? (
                  <p className="text-text-secondary text-xs mt-0.5">Loué — {a.leases[0].tenant?.firstName} {a.leases[0].tenant?.lastName}</p>
                ) : (
                  <p className="text-text-muted text-xs mt-0.5">Vacant</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
