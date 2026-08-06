'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTransition, type CSSProperties } from 'react';

export default function ViewToggle({ currentView }: { currentView: 'grid' | 'list' }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const setView = (view: 'grid' | 'list') => {
        const params = new URLSearchParams(searchParams.toString());
        // 'list' est le mode par défaut : on garde l'URL propre dans ce cas et
        // on n'ajoute le paramètre que pour la vue cartes.
        if (view === 'list') {
            params.delete('view');
        } else {
            params.set('view', view);
        }
        const qs = params.toString();
        startTransition(() => {
            router.push(qs ? `${pathname}?${qs}` : pathname);
        });
    };

    const btnBase: CSSProperties = {
        padding: '0.35rem 0.65rem',
        border: '1px solid transparent',
        borderRadius: 999,
        cursor: 'pointer',
        fontSize: '1.1rem',
        lineHeight: 1,
        transition: 'all 0.15s ease',
        opacity: isPending ? 0.6 : 1,
    };

    return (
        <div style={{
            display: 'flex',
            gap: '0.3rem',
            border: '1px solid var(--border-color)',
            borderRadius: 999,
            padding: '0.2rem',
            background: 'var(--surface)',
        }}>
            <button
                onClick={() => setView('grid')}
                title="Vue cartes"
                style={{
                    ...btnBase,
                    background: currentView === 'grid' ? 'var(--pill-ok-bg)' : 'transparent',
                    borderColor: currentView === 'grid' ? 'var(--pill-ok-border)' : 'transparent',
                    color: currentView === 'grid' ? 'var(--pill-ok-color)' : 'var(--text-muted)',
                }}
            >
                ⊞
            </button>
            <button
                onClick={() => setView('list')}
                title="Vue liste"
                style={{
                    ...btnBase,
                    background: currentView === 'list' ? 'var(--pill-ok-bg)' : 'transparent',
                    borderColor: currentView === 'list' ? 'var(--pill-ok-border)' : 'transparent',
                    color: currentView === 'list' ? 'var(--pill-ok-color)' : 'var(--text-muted)',
                }}
            >
                ☰
            </button>
        </div>
    );
}
