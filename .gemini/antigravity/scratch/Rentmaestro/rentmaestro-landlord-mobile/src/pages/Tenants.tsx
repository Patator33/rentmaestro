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
        ) : (() => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const isActive = (l: any) => l.isActive;
          const isFuture = (l: any) => new Date(l.startDate) > today;

          const activeTenants = tenants.filter((t: any) => t.leases.some(isActive));
          const futureTenants = tenants.filter((t: any) => !t.leases.some(isActive) && t.leases.some(isFuture));
          const formerTenants = tenants.filter((t: any) => !t.leases.some(isActive) && !t.leases.some(isFuture) && t.leases.length > 0);
          const noLeaseTenants = tenants.filter((t: any) => t.leases.length === 0);
          const allActive = [...activeTenants, ...noLeaseTenants];

          const renderCard = (t: any, dimmed = false) => {
            const displayLease = t.leases.find(isActive) || t.leases.find(isFuture) || t.leases[0];
            return (
              <button
                key={t.id}
                onClick={() => navigate(`/tenants/${t.id}`)}
                className="w-full bg-surface rounded-xl border border-border p-3 text-left active:opacity-80"
                style={dimmed ? { opacity: 0.55 } : undefined}
              >
                <p className="text-text-main font-medium text-sm">{t.firstName} {t.lastName}</p>
                <p className="text-text-muted text-xs">{t.email}</p>
                {displayLease && <p className="text-text-secondary text-xs mt-0.5">{displayLease.apartment?.name || displayLease.apartment?.address}</p>}
              </button>
            );
          };

          return (
            <>
              {allActive.length > 0 && (
                <div className="space-y-2">
                  {allActive.map((t: any) => renderCard(t))}
                </div>
              )}
              {futureTenants.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: '#f59e0b' }}>À venir — {futureTenants.length}</p>
                  <div className="space-y-2">
                    {futureTenants.map((t: any) => renderCard(t))}
                  </div>
                </div>
              )}
              {formerTenants.length > 0 && (
                <div className="mt-6">
                  <p className="text-text-muted text-xs font-semibold uppercase tracking-wide mb-2 px-1">Anciens locataires — {formerTenants.length}</p>
                  <div className="space-y-2">
                    {formerTenants.map((t: any) => renderCard(t, true))}
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}
