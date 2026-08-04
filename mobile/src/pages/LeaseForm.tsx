import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/landlord';

function defaultNextMonth() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

const GUARANTOR_LABELS: Record<string, string> = {
  NONE:    'Aucun',
  PRIVATE: 'Garant privé',
  VISALE:  'Garantie Visale',
};

const DEPOSIT_STATUS_LABELS: Record<string, string> = {
  PENDING:   'En attente',
  RECEIVED:  'Perçue',
  TO_RETURN: 'À rendre',
  RETURNED:  'Rendue',
  DEDUCTED:  'Déduite',
};

export default function LeaseForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({
    apartmentId: '', tenantId: '', startDate: '', endDate: '',
    rentAmount: '', chargesAmount: '', depositAmount: '', depositStatus: 'PENDING',
    rentEffectiveDate: defaultNextMonth(),
    guarantorType: 'NONE',
    guarantorFirstName: '', guarantorLastName: '', guarantorEmail: '', guarantorPhone: '',
  });
  const [apartments, setApartments] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getApartments().then(setApartments);
    api.getTenants().then(setTenants);
    if (isEdit) {
      api.getLease(id!).then(l => setForm({
        apartmentId: l.apartmentId, tenantId: l.tenantId,
        startDate: new Date(l.startDate).toISOString().split('T')[0],
        endDate: l.endDate ? new Date(l.endDate).toISOString().split('T')[0] : '',
        rentAmount: String(l.rentAmount), chargesAmount: String(l.chargesAmount),
        depositAmount: l.depositAmount != null ? String(l.depositAmount) : '',
        depositStatus: l.depositStatus || 'PENDING',
        rentEffectiveDate: defaultNextMonth(),
        guarantorType: l.guarantorType || 'NONE',
        guarantorFirstName: l.guarantorFirstName ?? '',
        guarantorLastName: l.guarantorLastName ?? '',
        guarantorEmail: l.guarantorEmail ?? '',
        guarantorPhone: l.guarantorPhone ?? '',
      }));
    }
  }, [id]);

  // Auto-fill rent/charges/deposit when apartment is selected (create mode)
  const handleApartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const aptId = e.target.value;
    if (!isEdit && aptId) {
      const apt = apartments.find((a: any) => a.id === aptId);
      if (apt) {
        setForm(f => ({
          ...f,
          apartmentId: aptId,
          rentAmount: apt.rent ? String(apt.rent) : f.rentAmount,
          chargesAmount: apt.charges ? String(apt.charges) : f.chargesAmount,
          depositAmount: apt.defaultDeposit ? String(apt.defaultDeposit) : f.depositAmount,
        }));
        return;
      }
    }
    setForm(f => ({ ...f, apartmentId: aptId }));
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (isEdit) await api.updateLease(id!, form);
      else await api.createLease(form);
      navigate('/leases');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally { setLoading(false); }
  };

  return (
    <div className="pb-nav safe-top overflow-y-auto" style={{ height: '100%' }}>
      <div className="px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => navigate(-1)} className="text-text-muted text-lg">←</button>
          <h1 className="text-xl font-bold text-text-main">{isEdit ? 'Modifier' : 'Nouveau'} bail</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {!isEdit && (
            <>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Appartement *</label>
                <select value={form.apartmentId} onChange={handleApartmentChange} required
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-text-main text-sm focus:outline-none focus:border-primary">
                  <option value="">Sélectionner...</option>
                  {apartments.map((a: any) => <option key={a.id} value={a.id}>{a.name || a.address}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Locataire *</label>
                <select value={form.tenantId} onChange={set('tenantId')} required
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-text-main text-sm focus:outline-none focus:border-primary">
                  <option value="">Sélectionner...</option>
                  {tenants.map((t: any) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                </select>
              </div>
            </>
          )}
          <Field label="Date de début *" type="date" value={form.startDate} onChange={set('startDate')} required />
          <Field label="Date de fin" type="date" value={form.endDate} onChange={set('endDate')} />
          <Field label="Loyer HC (€) *" type="number" value={form.rentAmount} onChange={set('rentAmount')} required />
          <Field label="Charges (€) *" type="number" value={form.chargesAmount} onChange={set('chargesAmount')} required />
          <Field label="Dépôt de garantie (€)" type="number" value={form.depositAmount} onChange={set('depositAmount')} />
          <div>
            <label className="block text-xs text-text-secondary mb-1">Statut de la caution</label>
            <select value={form.depositStatus} onChange={set('depositStatus')}
              className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-text-main text-sm focus:outline-none focus:border-primary">
              {Object.entries(DEPOSIT_STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Garant</label>
            <select value={form.guarantorType} onChange={set('guarantorType')}
              className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-text-main text-sm focus:outline-none focus:border-primary">
              {Object.entries(GUARANTOR_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {form.guarantorType === 'PRIVATE' && (
            <div className="rounded-xl border border-border p-3 space-y-3">
              <p className="text-xs uppercase tracking-wide text-text-muted">Informations du garant</p>
              <Field label="Prénom" value={form.guarantorFirstName} onChange={set('guarantorFirstName')} />
              <Field label="Nom" value={form.guarantorLastName} onChange={set('guarantorLastName')} />
              <Field label="Email" type="email" value={form.guarantorEmail} onChange={set('guarantorEmail')} />
              <Field label="Téléphone" type="tel" value={form.guarantorPhone} onChange={set('guarantorPhone')} />
            </div>
          )}

          {form.guarantorType === 'VISALE' && (
            <p className="text-xs rounded-xl px-3 py-2.5" style={{ background: 'rgba(103,232,249,0.06)', border: '1px solid rgba(103,232,249,0.25)', color: 'var(--accent-color)' }}>
              ℹ️ La garantie Visale sera notée sur le bail. Aucune information complémentaire requise.
            </p>
          )}

          {isEdit && (
            <div>
              <label className="block text-xs text-text-secondary mb-1">Date d'effet de la révision du loyer</label>
              <input
                type="month"
                value={form.rentEffectiveDate}
                onChange={set('rentEffectiveDate')}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-text-main text-sm focus:outline-none focus:border-primary"
              />
              <p className="text-text-muted text-xs mt-1">Si le loyer est modifié, les paiements non payés à partir de cette date seront mis à jour.</p>
            </div>
          )}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-primary text-white font-semibold py-3 rounded-xl disabled:opacity-50">
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
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
