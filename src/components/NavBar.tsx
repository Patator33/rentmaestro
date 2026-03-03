'use client';

import Link from "next/link";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import GlobalSearch from "@/components/GlobalSearch";
import { useState } from "react";
import { useRouter } from "next/navigation";

const NAV_ITEMS = [
    { href: "/", label: "🏠 Accueil" },
    { href: "/agenda", label: "📅 Agenda" },
    { href: "/companies", label: "🏢 Sociétés" },
    { href: "/apartments", label: "🏠 Biens" },
    { href: "/tenants", label: "👥 Locataires" },
    { href: "/leases", label: "📜 Baux" },
    { href: "/rents", label: "💰 Loyers" },
    { href: "/stats", label: "📈 Stats" },
    { href: "/reconciliation", label: "🔄 Banque" },
];

export default function NavBar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const router = useRouter();

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    return (
        <>
            <nav className="main-nav">
                <div className="nav-content">
                    <Link href="/" className="nav-home-link">
                        <Logo size={32} />
                        <span>Rentmaestro</span>
                    </Link>

                    <div className="desktop-nav">
                        {NAV_ITEMS.map((item) => (
                            <Link key={item.href} href={item.href} className="nav-link">
                                {item.label}
                            </Link>
                        ))}
                        <GlobalSearch />
                        <ThemeToggle />
                        <Link href="/settings/security" className="nav-link" title="Sécurité">🔐</Link>
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

            {/* Mobile Navigation Overlay & Menu */}
            <div className={`mobile-nav-overlay ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)}></div>
            <div className={`mobile-nav-menu ${menuOpen ? 'open' : ''}`}>
                <div style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Menu</span>
                    <ThemeToggle />
                </div>
                {NAV_ITEMS.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className="mobile-nav-link"
                        onClick={() => setMenuOpen(false)}
                    >
                        {item.label}
                    </Link>
                ))}
                <Link href="/settings/security" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>
                    🔐 Sécurité
                </Link>
                <button
                    onClick={() => { setMenuOpen(false); handleLogout(); }}
                    className="mobile-nav-link"
                    style={{ marginTop: 'auto', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', textAlign: 'left', width: '100%', color: '#ef4444' }}
                >
                    ↪ Déconnexion
                </button>
            </div>
        </>
    );
}
