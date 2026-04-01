import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/landlord';

export default function TenantDetail() {
  const { id } = useParams<{ id: string }>();
  const [tenant, setTenant] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { api.getTenant(id!).then(setTenant); }, [id]);

  const handleDelete = async () => {
    if (!confirm('Supprimer ce locataire ?')) return;
    setDeleting(true);
    try {
      await api.deleteTenant(id!);
      navigate('/tenants');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur');
      setDeleting(false);
    }
  };

  const handleCall = (phone: string) => {
    if (confirm(`Appeler ${phone} ?`)) {
      window.location.href = `tel:${phone}`;
    }
  };

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  if (!tenant) return <div className="safe-top px-4 py-4 text-text-muted text-sm">Chargement...</div>;

  return (
    <div className="pb-nav safe-top overflow-y-auto" style={{ height: '100%' }}>
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/tenants')} className="text-text-muted text-lg">←</button>
            <h1 className="text-xl font-bold text-text-main">{tenant.firstName} {tenant.lastName}</h1>
          </div>
          <button onClick={() => navigate(`/tenants/${id}/edit`)} className="text-primary text-sm">Modifier</button>
        </div>

        <div className="bg-surface rounded-xl border border-border p-3 mb-3 space-y-2">
          {tenant.email && (
            <div className="flex justify-between items-center">
              <span className="text-text-muted text-xs">Email</span>
              <button onClick={() => handleEmail(tenant.email)} className="text-primary text-xs underline">
                {tenant.email}
              </button>
            </div>
          )}
          {tenant.phone ? (
            <div className="flex justify-between items-center">
              <span className="text-text-muted text-xs">Téléphone</span>
              <button onClick={() => handleCall(tenant.phone)} className="text-primary text-xs underline">
                {tenant.phone}
              </button>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-text-muted text-xs">Téléphone</span>
              <span className="text-text-main text-xs">—</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-text-muted text-xs">Jour de paiement</span>
            <span className="text-text-main text-xs">{tenant.paymentDay || 5}</span>
          </div>
          {tenant.coTenantFirstName && (
            <div className="flex justify-between items-center">
              <span className="text-text-muted text-xs">Co-locataire</span>
              <span className="text-text-main text-xs">{tenant.coTenantFirstName} {tenant.coTenantLastName}</span>
            </div>
          )}
        </div>

        {tenant.leases?.length > 0 && (
          <div className="bg-surface rounded-xl border border-border p-3 mb-3">
            <p className="text-text-muted text-xs uppercase tracking-wide mb-2">Baux</p>
            {tenant.leases.map((l: any) => (
              <button
                key={l.id}
                onClick={() => navigate(`/leases/${l.id}`)}
                className="w-full text-left py-2 border-b border-border last:border-0 active:opacity-70"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-text-main text-sm font-medium">{l.apartment?.name || l.apartment?.address}</p>
                    <p className="text-text-muted text-xs">{new Date(l.startDate).toLocaleDateString('fr-FR')} — {l.endDate ? new Date(l.endDate).toLocaleDateString('fr-FR') : 'en cours'}</p>
                    <p className="text-text-secondary text-xs">{(l.rentAmount + l.chargesAmount).toFixed(2)} € CC</p>
                  </div>
                  <span className="text-text-muted text-lg ml-2">›</span>
                </div>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => navigate(`/messages/${id}`)}
          className="w-full text-sm text-primary border border-primary/30 py-2.5 rounded-xl mb-2"
        >
          Envoyer un message
        </button>

        <button onClick={handleDelete} disabled={deleting} className="w-full text-sm text-red-400 border border-red-400/30 py-2.5 rounded-xl disabled:opacity-50">
          {deleting ? 'Suppression...' : 'Supprimer le locataire'}
        </button>
      </div>
    </div>
  );
}
