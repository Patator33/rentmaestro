import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/landlord';

interface SearchResult {
  tenants: { id: string; firstName: string; lastName: string; email: string }[];
  apartments: { id: string; address: string; city: string; name: string | null }[];
}

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); setOpen(false); return; }
    setLoading(true);
    try {
      const data = await api.search(q);
      setResults(data);
      setOpen(true);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  // Close on outside tap
  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, []);

  const go = (path: string) => {
    setQuery('');
    setResults(null);
    setOpen(false);
    inputRef.current?.blur();
    navigate(path);
  };

  const hasResults = results && (results.tenants.length > 0 || results.apartments.length > 0);

  return (
    <div ref={containerRef} className="relative mb-4">
      <div className="relative flex items-center">
        <span className="absolute left-3 text-text-muted text-sm pointer-events-none">
          {loading ? '⏳' : '🔍'}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => hasResults && setOpen(true)}
          placeholder="Rechercher un locataire, un bien…"
          className="w-full bg-surface border border-border rounded-xl pl-9 pr-4 py-2.5 text-text-main text-sm focus:outline-none focus:border-primary"
        />
        {query.length > 0 && (
          <button
            onClick={() => { setQuery(''); setResults(null); setOpen(false); }}
            className="absolute right-3 text-text-muted text-sm"
          >
            ✕
          </button>
        )}
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border rounded-xl shadow-lg overflow-hidden z-50">
          {hasResults ? (
            <>
              {results!.apartments.length > 0 && (
                <>
                  <p className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-text-muted bg-surface border-b border-border">🏠 Biens</p>
                  {results!.apartments.map(a => (
                    <button
                      key={a.id}
                      onClick={() => go(`/apartments/${a.id}`)}
                      className="w-full text-left px-3 py-2.5 border-b border-border last:border-0 active:bg-surface-active"
                    >
                      <p className="text-text-main text-sm font-medium">{a.name || a.address}</p>
                      {a.city && <p className="text-text-muted text-xs">{a.city}</p>}
                    </button>
                  ))}
                </>
              )}
              {results!.tenants.length > 0 && (
                <>
                  <p className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-text-muted bg-surface border-b border-border">👥 Locataires</p>
                  {results!.tenants.map(t => (
                    <button
                      key={t.id}
                      onClick={() => go(`/tenants/${t.id}`)}
                      className="w-full text-left px-3 py-2.5 border-b border-border last:border-0 active:bg-surface-active"
                    >
                      <p className="text-text-main text-sm font-medium">{t.firstName} {t.lastName}</p>
                      <p className="text-text-muted text-xs">{t.email}</p>
                    </button>
                  ))}
                </>
              )}
            </>
          ) : (
            <p className="text-text-muted text-sm text-center py-4">
              {query.length >= 2 && !loading ? `Aucun résultat pour « ${query} »` : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
