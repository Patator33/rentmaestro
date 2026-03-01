'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface SearchResult {
    tenants: { id: string; firstName: string; lastName: string; email: string }[];
    apartments: { id: string; address: string; city: string; name: string | null }[];
    contacts: { id: string; name: string; role: string; apartmentId: string | null }[];
}

const itemStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
    width: '100%', padding: '0.55rem 0.75rem', background: 'transparent',
    border: 'none', borderBottom: '1px solid var(--border-color)',
    cursor: 'pointer', textAlign: 'left', gap: '0.1rem',
};

const sectionHeaderStyle: React.CSSProperties = {
    padding: '0.35rem 0.75rem', fontSize: '0.68rem', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    color: 'var(--text-muted)', background: 'var(--surface-hover)',
};

export default function GlobalSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult | null>(null);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const search = useCallback(async (q: string) => {
        if (q.length < 2) { setResults(null); setOpen(false); return; }
        setLoading(true);
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
            const data: SearchResult = await res.json();
            setResults(data);
            setOpen(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const t = setTimeout(() => search(query), 250);
        return () => clearTimeout(t);
    }, [query, search]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const navigate = (href: string) => {
        setQuery('');
        setOpen(false);
        setResults(null);
        router.push(href);
    };

    const hasResults = results && (
        results.tenants.length > 0 || results.apartments.length > 0 || results.contacts.length > 0
    );

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '0.6rem', color: 'var(--text-muted)', fontSize: '0.85rem', pointerEvents: 'none' }}>
                    {loading ? '⏳' : '🔍'}
                </span>
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onFocus={() => hasResults && setOpen(true)}
                    onKeyDown={e => e.key === 'Escape' && (setOpen(false))}
                    placeholder="Rechercher…"
                    style={{
                        paddingLeft: '2rem', paddingRight: '0.75rem',
                        paddingTop: '0.35rem', paddingBottom: '0.35rem',
                        background: 'var(--surface)', border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-full)', color: 'var(--text-main)',
                        fontSize: '0.85rem', width: '180px', fontFamily: 'inherit', outline: 'none',
                    }}
                />
            </div>

            {open && (hasResults || (query.length >= 2 && !loading)) && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '300px',
                    background: 'var(--surface)', border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                    zIndex: 1000, overflow: 'hidden',
                }}>
                    {hasResults ? (
                        <>
                            {results!.apartments.length > 0 && (
                                <>
                                    <div style={sectionHeaderStyle}>🏠 Biens</div>
                                    {results!.apartments.map(a => (
                                        <button key={a.id} onClick={() => navigate(`/apartments/${a.id}`)} style={itemStyle}>
                                            <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>{a.name || a.address}</span>
                                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{a.city}</span>
                                        </button>
                                    ))}
                                </>
                            )}
                            {results!.tenants.length > 0 && (
                                <>
                                    <div style={sectionHeaderStyle}>👥 Locataires</div>
                                    {results!.tenants.map(t => (
                                        <button key={t.id} onClick={() => navigate(`/tenants/${t.id}`)} style={itemStyle}>
                                            <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>{t.firstName} {t.lastName}</span>
                                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.email}</span>
                                        </button>
                                    ))}
                                </>
                            )}
                            {results!.contacts.length > 0 && (
                                <>
                                    <div style={sectionHeaderStyle}>📋 Contacts</div>
                                    {results!.contacts.map(c => (
                                        <button key={c.id} onClick={() => navigate(c.apartmentId ? `/apartments/${c.apartmentId}` : '/contacts')} style={itemStyle}>
                                            <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>{c.name}</span>
                                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{c.role}</span>
                                        </button>
                                    ))}
                                </>
                            )}
                        </>
                    ) : (
                        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            Aucun résultat pour « {query} »
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
