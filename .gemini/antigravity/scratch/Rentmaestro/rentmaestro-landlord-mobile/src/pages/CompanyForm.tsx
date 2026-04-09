import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/landlord';

const COMPANY_TYPES = ['SCI', 'SARL', 'SAS', 'SASU', 'EURL', 'SA', 'SNC', 'GIE', 'Particulier'];

export default function CompanyForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [type, setType] = useState('SCI');
  const [siret, setSiret] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      api.getCompany(id!).then((c: any) => {
        setName(c.name ?? '');
        setType(c.type ?? 'SCI');
        setSiret(c.siret ?? '');
        setAddress(c.address ?? '');
      }).catch(() => {});
    }
  }, [id, isEdit]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Le nom est requis.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const data: Record<string, string> = { name: name.trim(), type };
      if (siret.trim()) data.siret = siret.trim();
      if (address.trim()) data.address = address.trim();
      if (isEdit) {
        await api.updateCompany(id!, data);
        navigate(`/companies/${id}`);
      } else {
        const c = await api.createCompany(data);
        navigate(`/companies/${c.id}`);
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
          <h1 className="text-xl font-bold text-text-main">{isEdit ? 'Modifier la société' : 'Nouvelle société'}</h1>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-text-muted text-xs block mb-1">Nom *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="SCI Les Lilas"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-text-main text-sm"
            />
          </div>

          <div>
            <label className="text-text-muted text-xs block mb-1">Type *</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-text-main text-sm"
            >
              {COMPANY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="text-text-muted text-xs block mb-1">SIRET</label>
            <input
              type="text"
              value={siret}
              onChange={e => setSiret(e.target.value)}
              placeholder="12345678900012"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-text-main text-sm"
            />
          </div>

          <div>
            <label className="text-text-muted text-xs block mb-1">Adresse</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="12 rue de la Paix, 75001 Paris"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-text-main text-sm"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
            style={{ background: 'var(--primary)' }}
          >
            {saving ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Créer la société'}
          </button>
        </div>
      </div>
    </div>
  );
}
