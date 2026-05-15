import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/landlord';

export default function BuildingForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [city, setCity] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [companies, setCompanies] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getCompanies().then(setCompanies).catch(() => {});
    if (isEdit) {
      api.getBuildings().then((list: any[]) => {
        const b = list.find((b: any) => b.id === id);
        if (b) {
          setName(b.name ?? '');
          setAddress(b.address ?? '');
          setZipCode(b.zipCode ?? '');
          setCity(b.city ?? '');
          setCompanyId(b.companyId ?? '');
        }
      }).catch(() => {});
    }
  }, [id, isEdit]);

  const handleSubmit = async () => {
    if (!name.trim() || !address.trim()) {
      setError('Nom et rue requis.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const data: Record<string, string> = { name: name.trim(), address: address.trim() };
      if (zipCode.trim()) data.zipCode = zipCode.trim();
      if (city.trim()) data.city = city.trim();
      if (companyId) data.companyId = companyId;
      if (isEdit) {
        await api.updateBuilding(id!, data);
        navigate(`/buildings/${id}`);
      } else {
        const b = await api.createBuilding(data);
        navigate(`/buildings/${b.id}`);
      }
    } catch (e: any) {
      setError(e.message || 'Erreur');
      setSaving(false);
    }
  };

  return (
    <div className="pb-nav safe-top overflow-y-auto" style={{ height: '100%' }}>
      <div className="px-4 py-4">
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => navigate(-1)} className="text-text-muted text-lg">←</button>
          <h1 className="text-xl font-bold text-text-main">{isEdit ? 'Modifier l\'immeuble' : 'Nouvel immeuble'}</h1>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-text-muted text-xs block mb-1">Nom *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Résidence des Lilas"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-text-main text-sm"
            />
          </div>

          <div>
            <label className="text-text-muted text-xs block mb-1">Rue *</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="12 rue de la Paix"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-text-main text-sm"
            />
          </div>

          <div className="flex gap-2">
            <div className="w-1/3">
              <label className="text-text-muted text-xs block mb-1">Code postal</label>
              <input
                type="text"
                value={zipCode}
                onChange={e => setZipCode(e.target.value)}
                placeholder="75001"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-text-main text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-text-muted text-xs block mb-1">Ville</label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Paris"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-text-main text-sm"
              />
            </div>
          </div>

          {companies.length > 0 && (
            <div>
              <label className="text-text-muted text-xs block mb-1">Société (optionnel)</label>
              <select
                value={companyId}
                onChange={e => setCompanyId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-text-main text-sm"
              >
                <option value="">— Aucune —</option>
                {companies.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-3 rounded-xl font-semibold text-sm bg-primary text-white disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Créer l\'immeuble'}
          </button>
        </div>
      </div>
    </div>
  );
}
