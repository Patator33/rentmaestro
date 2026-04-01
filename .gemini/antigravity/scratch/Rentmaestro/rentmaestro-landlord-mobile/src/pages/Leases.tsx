import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/landlord';

export default function Leases() {
  const [leases, setLeases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { api.getLeases().then(setLeases).finally(() => setLoading(false)); }, []);

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
          <div className="space-y-2">
            {leases.map((l: any) => (
              <button
                key={l.id}
                onClick={() => navigate(`/leases/${l.id}`)}
                className="w-full bg-surface rounded-xl border border-border p-3 text-left active:opacity-80"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-text-main font-medium text-sm">{l.tenant?.firstName} {l.tenant?.lastName}</p>
                    <p className="text-text-muted text-xs">{l.apartment?.name || l.apartment?.address}</p>
                    <p className="text-text-muted text-xs">{new Date(l.startDate).toLocaleDateString('fr-FR')} — {l.endDate ? new Date(l.endDate).toLocaleDateString('fr-FR') : 'en cours'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-text-main text-sm font-semibold">{(l.rentAmount + l.chargesAmount).toFixed(0)} €</p>
                    <p className={`text-xs ${l.isActive ? 'text-paid' : 'text-text-muted'}`}>{l.isActive ? 'Actif' : 'Terminé'}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
