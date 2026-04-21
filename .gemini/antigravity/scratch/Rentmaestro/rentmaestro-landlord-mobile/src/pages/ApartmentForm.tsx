import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/landlord';

export default function ApartmentForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({
    name: '', address: '', complement: '', city: '', zipCode: '',
    rent: '', charges: '', mortgageAmount: '', insuranceAmount: '',
    taxAmount: '', defaultDeposit: '', buildingId: '', companyId: '',
  });
  const [buildings, setBuildings] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.getBuildings(), api.getCompanies()])
      .then(([b, c]) => { setBuildings(b); setCompanies(c); })
      .catch(() => {});
    if (isEdit) {
      api.getApartment(id!).then(a => setForm({
        name: a.name || '', address: a.address || '', complement: a.complement || '',
        city: a.city || '', zipCode: a.zipCode || '',
        rent: String(a.rent || ''), charges: String(a.charges || ''),
        mortgageAmount: a.mortgageAmount != null ? String(a.mortgageAmount) : '',
        insuranceAmount: a.insuranceAmount != null ? String(a.insuranceAmount) : '',
        taxAmount: a.taxAmount != null ? String(a.taxAmount) : '',
        defaultDeposit: a.defaultDeposit != null ? String(a.defaultDeposit) : '',
        buildingId: a.building?.id || '',
        companyId: a.company?.id || '',
      }));
    }
  }, [id]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleBuildingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const bId = e.target.value;
    if (!isEdit && bId) {
      const b = buildings.find((b: any) => b.id === bId);
      if (b) {
        setForm(f => ({ ...f, buildingId: bId, address: b.address || f.address, zipCode: b.zipCode || f.zipCode, city: b.city || f.city }));
        return;
      }
    }
    setForm(f => ({ ...f, buildingId: bId }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (isEdit) await api.updateApartment(id!, form);
      else await api.createApartment(form);
      navigate(isEdit ? `/apartments/${id}` : '/apartments');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally { setLoading(false); }
  };

  return (
    <div className="pb-nav safe-top overflow-y-auto" style={{ height: '100%' }}>
      <div className="px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => navigate(-1)} className="text-text-muted text-lg">←</button>
          <h1 className="text-xl font-bold text-text-main">{isEdit ? 'Modifier' : 'Nouvel'} appartement</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Société / entité juridique</label>
            <select
              value={form.companyId}
              onChange={set('companyId')}
              className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-text-main text-sm focus:outline-none focus:border-primary"
            >
              <option value="">Nom propre</option>
              {companies.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}{c.type && c.type !== c.name ? ` (${c.type})` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Immeuble (optionnel)</label>
            <select
              value={form.buildingId}
              onChange={handleBuildingChange}
              className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-text-main text-sm focus:outline-none focus:border-primary"
            >
              <option value="">Aucun immeuble</option>
              {buildings.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}{b.city ? ` — ${b.city}` : ''}</option>
              ))}
            </select>
          </div>
          <Field label="Nom (optionnel)" value={form.name} onChange={set('name')} />
          <Field label="Adresse *" value={form.address} onChange={set('address')} required />
          <Field label="Complément" value={form.complement} onChange={set('complement')} />
          <Field label="Ville *" value={form.city} onChange={set('city')} required />
          <Field label="Code postal *" value={form.zipCode} onChange={set('zipCode')} required />
          <Field label="Loyer HC (€)" type="number" value={form.rent} onChange={set('rent')} />
          <Field label="Charges (€)" type="number" value={form.charges} onChange={set('charges')} />
          <p className="text-text-muted text-xs uppercase tracking-wide pt-2">Charges propriétaire</p>
          <Field label="Crédit immobilier (€/mois)" type="number" value={form.mortgageAmount} onChange={set('mortgageAmount')} />
          <Field label="Assurance (€/an)" type="number" value={form.insuranceAmount} onChange={set('insuranceAmount')} />
          <Field label="Taxe foncière (€/an)" type="number" value={form.taxAmount} onChange={set('taxAmount')} />
          <p className="text-text-muted text-xs uppercase tracking-wide pt-2">Bail</p>
          <Field label="Caution par défaut (€)" type="number" value={form.defaultDeposit} onChange={set('defaultDeposit')} />
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
