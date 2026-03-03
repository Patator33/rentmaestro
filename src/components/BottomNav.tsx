'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface BottomNavProps {
    onMoreClick: () => void;
}

const TABS = [
    { href: '/',            icon: '🏠', label: 'Accueil' },
    { href: '/apartments',  icon: '🏢', label: 'Biens' },
    { href: '/rents',       icon: '💰', label: 'Loyers' },
    { href: '/tenants',     icon: '👥', label: 'Locataires' },
];

export default function BottomNav({ onMoreClick }: BottomNavProps) {
    const pathname = usePathname();

    const isActive = (href: string) =>
        href === '/' ? pathname === '/' : pathname.startsWith(href);

    return (
        <nav className="bottom-nav">
            {TABS.map((tab) => (
                <Link
                    key={tab.href}
                    href={tab.href}
                    className={`bottom-nav-item${isActive(tab.href) ? ' active' : ''}`}
                >
                    <span className="bottom-nav-icon">{tab.icon}</span>
                    <span className="bottom-nav-label">{tab.label}</span>
                </Link>
            ))}
            <button className="bottom-nav-item" onClick={onMoreClick}>
                <span className="bottom-nav-icon">☰</span>
                <span className="bottom-nav-label">Plus</span>
            </button>
        </nav>
    );
}
