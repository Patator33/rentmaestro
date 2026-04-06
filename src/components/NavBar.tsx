'use client';

import Link from "next/link";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import GlobalSearch from "@/components/GlobalSearch";
import BottomNav from "@/components/BottomNav";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

const GESTION_ITEMS = [
    { href: "/tenants", label: "👥 Locataires" },
    { href: "/apartments", label: "🏠 Appartements" },
    { href: "/buildings", label: "🏢 Immeubles" },
    { href: "/leases", label: "📜 Baux" },
    { href: "/companies", label: "🏛️ Sociétés" },
];

const NAV_ITEMS = [
    { href: "/", label: "🏠 Accueil" },
    { href: "/agenda", label: "📅 Agenda" },
    { href: "/rents", label: "💰 Loyers" },
    { href: "/travaux", label: "🔧 Travaux" },
    { href: "/stats", label: "📈 Stats" },
    { href: "/reconciliation", label: "🔄 Banque" },
    { href: "/settings/security", label: "🔐 Sécurité" },
];

export default function NavBar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [gestionOpen, setGestionOpen] = useState(false);
    const [gestionMobileOpen, setGestionMobileOpen] = useState(false);
    const [dateStr, setDateStr] = useState('');
    const router = useRouter();
    const pathname = usePathname();
    const gestionRef = useRef<HTMLDivElement>(null);

    const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);
    const isGestionActive = GESTION_ITEMS.some(i => pathname.startsWith(i.href));

    useEffect(() => {
        setDateStr(new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }));
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (gestionRef.current && !gestionRef.current.contains(e.target as Node)) {
                setGestionOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    return (
        <>
            <nav className="main-nav">
                <div className="nav-content">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                        <Link href="/" className="nav-home-link">
                            <Logo size={32} />
                            <span>Rentmaestro</span>
                        </Link>
                        {dateStr && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', paddingLeft: '0.25rem', textTransform: 'capitalize' }}>
                                {dateStr}
                            </span>
                        )}
                    </div>

                    <div className="desktop-nav">
                        {/* Gestion dropdown */}
                        <div ref={gestionRef} style={{ position: 'relative' }}>
                            <button
                                onClick={() => setGestionOpen(v => !v)}
                                className={`nav-link${isGestionActive ? ' nav-link-active' : ''}`}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            >
                                📁 Gestion <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>{gestionOpen ? '▲' : '▼'}</span>
                            </button>
                            {gestionOpen && (
                                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', minWidth: '180px', zIndex: 100, overflow: 'hidden' }}>
                                    {GESTION_ITEMS.map(item => (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setGestionOpen(false)}
                                            className={`nav-link${isActive(item.href) ? ' nav-link-active' : ''}`}
                                            style={{ display: 'block', padding: '0.6rem 1rem', borderRadius: 0, borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}
                                        >
                                            {item.label}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>

                        {NAV_ITEMS.map((item) => (
                            <Link key={item.href} href={item.href} className={`nav-link${isActive(item.href) ? ' nav-link-active' : ''}`}>
                                {item.label}
                            </Link>
                        ))}
                        <GlobalSearch />
                        <ThemeToggle />
                        <button
                            onClick={handleLogout}
                            className="nav-link"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
                            title="Déconnexion"
                        >
                            ↪ Déconnexion
                        </button>
                    </div>

                    <button
                        className="nav-toggle"
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-label="Toggle menu"
                    >
                        {menuOpen ? '✕' : '☰'}
                    </button>
                </div>
            </nav>

            {/* Mobile Navigation Overlay & Slide-out Menu */}
            <div className={`mobile-nav-overlay ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)}></div>
            <div className={`mobile-nav-menu ${menuOpen ? 'open' : ''}`}>
                <div style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Menu</span>
                    <ThemeToggle />
                </div>

                {/* Gestion section in mobile menu */}
                <button
                    onClick={() => setGestionMobileOpen(v => !v)}
                    className={`mobile-nav-link${isGestionActive ? ' mobile-nav-link-active' : ''}`}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', textAlign: 'left', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                    <span>📁 Gestion</span>
                    <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>{gestionMobileOpen ? '▲' : '▼'}</span>
                </button>
                {gestionMobileOpen && (
                    <div style={{ paddingLeft: '1rem', borderLeft: '2px solid var(--border-color)', marginLeft: '0.5rem', marginBottom: '0.25rem' }}>
                        {GESTION_ITEMS.map(item => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`mobile-nav-link${isActive(item.href) ? ' mobile-nav-link-active' : ''}`}
                                onClick={() => setMenuOpen(false)}
                                style={{ fontSize: '0.9rem' }}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>
                )}

                {NAV_ITEMS.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`mobile-nav-link${isActive(item.href) ? ' mobile-nav-link-active' : ''}`}
                        onClick={() => setMenuOpen(false)}
                    >
                        {item.label}
                    </Link>
                ))}
                <button
                    onClick={() => { setMenuOpen(false); handleLogout(); }}
                    className="mobile-nav-link"
                    style={{ marginTop: 'auto', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', textAlign: 'left', width: '100%', color: '#ef4444' }}
                >
                    ↪ Déconnexion
                </button>
            </div>

            {/* Bottom Navigation Bar (mobile only) */}
            <BottomNav onMoreClick={() => setMenuOpen(true)} />
        </>
    );
}
