import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/landlord';

export default function Tenants() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.getTenants().then(setTenants).finally(() => setLoading(false));
  }, []);

  return (
    <div className="pb-nav safe-top overflow-y-auto" style={{ height: '100%' }}>
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/manage')} className="text-text-muted text-lg">←</button>
            <h1 className="text-xl font-bold text-text-main">Locataires</h1>
          </div>
          <button onClick={() => navigate('/tenants/new')} className="bg-primary text-white text-sm px-3 py-1.5 rounded-lg font-medium">+ Nouveau</button>
        </div>

        {loading ? (
          <p className="text-text-muted text-sm text-center py-8">Chargement...</p>
        ) : (
          <div className="space-y-2">
            {tenants.map((t: any) => (
              <button
                key={t.id}
                onClick={() => navigate(`/tenants/${t.id}`)}
                className="w-full bg-surface rounded-xl border border-border p-3 text-left active:opacity-80"
              >
                <p className="text-text-main font-medium text-sm">{t.firstName} {t.lastName}</p>
                <p className="text-text-muted text-xs">{t.email}</p>
                {t.leases[0] && <p className="text-text-secondary text-xs mt-0.5">{t.leases[0].apartment?.name || t.leases[0].apartment?.address}</p>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
