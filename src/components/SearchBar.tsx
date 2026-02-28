'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import styles from './SearchBar.module.css';

interface FilterOption {
    value: string;
    label: string;
}

interface SearchBarProps {
    placeholder?: string;
    filterOptions?: FilterOption[];
    filterParamName?: string;
    filterLabel?: string;
    resultCount?: number;
}

export default function SearchBar({
    placeholder = 'Rechercher...',
    filterOptions,
    filterParamName = 'filter',
    filterLabel,
    resultCount,
}: SearchBarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const currentQuery = searchParams.get('q') || '';
    const currentFilter = searchParams.get(filterParamName) || '';

    const updateParams = useCallback((key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`);
        });
    }, [router, pathname, searchParams, startTransition]);

    return (
        <div className={styles.searchContainer}>
            <div className={styles.searchWrapper}>
                <span className={styles.searchIcon}>🔍</span>
                <input
                    type="text"
                    className={styles.searchInput}
                    placeholder={placeholder}
                    defaultValue={currentQuery}
                    onChange={(e) => updateParams('q', e.target.value)}
                    style={{ opacity: isPending ? 0.7 : 1 }}
                />
            </div>

            {filterOptions && (
                <select
                    className={styles.filterSelect}
                    value={currentFilter}
                    onChange={(e) => updateParams(filterParamName, e.target.value)}
                    aria-label={filterLabel || 'Filtrer'}
                >
                    {filterOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            )}

            {resultCount !== undefined && (
                <span className={styles.resultCount}>
                    {resultCount} résultat{resultCount !== 1 ? 's' : ''}
                </span>
            )}
        </div>
    );
}
