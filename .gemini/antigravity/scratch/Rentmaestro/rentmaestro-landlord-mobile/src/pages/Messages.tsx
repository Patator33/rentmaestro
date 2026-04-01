import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/landlord';

interface Conversation {
  tenantId: string;
  firstName: string;
  lastName: string;
  apartment: string | null;
  lastMessage: { content: string; fromTenant: boolean; createdAt: string } | null;
  unreadCount: number;
}

export default function Messages() {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.getConversations(), api.getTenants()])
      .then(([c, t]) => { setConvs(c); setTenants(t); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="pb-nav safe-top overflow-y-auto" style={{ height: '100%' }}>
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-text-main">Messages</h1>
          <button
            onClick={() => setShowPicker(true)}
            className="bg-primary text-white text-sm px-3 py-1.5 rounded-lg font-medium"
          >
            + Nouveau
          </button>
        </div>

        {loading ? (
          <p className="text-text-muted text-sm text-center py-8">Chargement...</p>
        ) : convs.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-8">Aucun message.</p>
        ) : (
          <div className="space-y-2">
            {convs.map(c => (
              <button
                key={c.tenantId}
                onClick={() => navigate(`/messages/${c.tenantId}`)}
                className="w-full bg-surface rounded-xl border border-border p-3 text-left active:opacity-80"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-text-main font-medium text-sm">{c.firstName} {c.lastName}</p>
                      {c.unreadCount > 0 && (
                        <span className="bg-primary text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{c.unreadCount}</span>
                      )}
                    </div>
                    {c.apartment && <p className="text-text-muted text-xs">{c.apartment}</p>}
                    {c.lastMessage && (
                      <p className="text-text-secondary text-xs mt-1 truncate">
                        {c.lastMessage.fromTenant ? '' : 'Vous : '}{c.lastMessage.content}
                      </p>
                    )}
                  </div>
                  {c.lastMessage && (
                    <p className="text-text-muted text-xs ml-2 shrink-0">
                      {new Date(c.lastMessage.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {showPicker && (
        <div
          className="fixed inset-0 bg-black/60 flex items-end z-50"
          onClick={() => setShowPicker(false)}
        >
          <div
            className="w-full bg-bg rounded-t-2xl p-4 max-h-[70vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-text-main font-semibold mb-3">Choisir un locataire</p>
            {tenants.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-4">Aucun locataire.</p>
            ) : (
              <div className="space-y-1">
                {tenants.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setShowPicker(false); navigate(`/messages/${t.id}`); }}
                    className="w-full text-left px-3 py-2.5 rounded-xl active:bg-surface"
                  >
                    <p className="text-text-main text-sm font-medium">{t.firstName} {t.lastName}</p>
                    {t.leases?.[0]?.apartment && (
                      <p className="text-text-muted text-xs">{t.leases[0].apartment.name || t.leases[0].apartment.address}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setShowPicker(false)} className="w-full mt-3 py-2.5 text-text-muted text-sm border border-border rounded-xl">
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
