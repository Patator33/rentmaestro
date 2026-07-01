import { useNavigate } from 'react-router-dom';

const sections = [
  { label: 'Locataires', icon: '👥', path: '/tenants' },
  { label: 'Appartements', icon: '🏠', path: '/apartments' },
  { label: 'Immeubles', icon: '🏢', path: '/buildings' },
  { label: 'Baux', icon: '📜', path: '/leases' },
  { label: 'Sociétés', icon: '🏛️', path: '/companies' },
  { label: 'Paramètres', icon: '⚙️', path: '/settings' },
];

export default function Manage() {
  const navigate = useNavigate();
  return (
    <div className="pb-nav safe-top overflow-y-auto" style={{ height: '100%' }}>
      <div className="px-4 py-4">
        <h1 className="text-xl font-bold text-text-main mb-4">Gestion</h1>
        <div className="space-y-2">
          {sections.map(s => (
            <button
              key={s.path}
              onClick={() => navigate(s.path)}
              className="w-full bg-surface rounded-xl border border-border p-4 flex items-center gap-3 text-left active:opacity-80"
            >
              <span className="text-2xl">{s.icon}</span>
              <span className="text-text-main font-medium">{s.label}</span>
              <span className="ml-auto text-text-muted">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
