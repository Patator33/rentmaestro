import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/landlord';

export default function TenantForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', paymentDay: '5', coTenantFirstName: '', coTenantLastName: '', coTenantEmail: '', coTenantPhone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      api.getTenant(id!).then(t => setForm({
        firstName: t.firstName || '', lastName: t.lastName || '', email: t.email || '', phone: t.phone || '',
        paymentDay: String(t.paymentDay || 5), coTenantFirstName: t.coTenantFirstName || '',
        coTenantLastName: t.coTenantLastName || '', coTenantEmail: t.coTenantEmail || '', coTenantPhone: t.coTenantPhone || '',
      }));
    }
  }, [id]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (isEdit) await api.updateTenant(id!, form);
      else await api.createTenant(form);
      navigate('/tenants');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-nav safe-top overflow-y-auto" style={{ height: '100%' }}>
      <div className="px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => navigate(-1)} className="text-text-muted text-lg">←</button>
          <h1 className="text-xl font-bold text-text-main">{isEdit ? 'Modifier' : 'Nouveau'} locataire</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Prénom *" value={form.firstName} onChange={set('firstName')} required />
          <Field label="Nom *" value={form.lastName} onChange={set('lastName')} required />
          <Field label="Email *" type="email" value={form.email} onChange={set('email')} required />
          <Field label="Téléphone" value={form.phone} onChange={set('phone')} />
          <Field label="Jour de paiement" type="number" value={form.paymentDay} onChange={set('paymentDay')} />

          <p className="text-text-muted text-xs uppercase tracking-wide pt-2">Co-locataire (optionnel)</p>
          <Field label="Prénom co-locataire" value={form.coTenantFirstName} onChange={set('coTenantFirstName')} />
          <Field label="Nom co-locataire" value={form.coTenantLastName} onChange={set('coTenantLastName')} />
          <Field label="Email co-locataire" type="email" value={form.coTenantEmail} onChange={set('coTenantEmail')} />
          <Field label="Tél. co-locataire" value={form.coTenantPhone} onChange={set('coTenantPhone')} />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={loading} className="w-full bg-primary text-white font-semibold py-3 rounded-xl disabled:opacity-50">
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>

          {isEdit && (
            <button
              type="button"
              onClick={async () => {
                if (!confirm('Supprimer ce locataire ? Cette action est irréversible.')) return;
                try {
                  await api.deleteTenant(id!);
                  navigate('/tenants');
                } catch (e: any) {
                  alert(e.message || 'Erreur lors de la suppression');
                }
              }}
              className="w-full py-3 rounded-xl font-semibold text-sm border"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
            >
              🗑 Supprimer ce locataire
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required }: any) {
  return (
    <div>
      <label className="block text-xs text-text-secondary mb-1">{label}</label>
      <input type={type} value={value} onChange={onChange} required={required}
        className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-text-main text-sm focus:outline-none focus:border-primary" />
    </div>
  );
}
