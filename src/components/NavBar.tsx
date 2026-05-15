'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import BottomNav from "@/components/BottomNav";

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/>
      </svg>
    ),
  },
  {
    href: '/apartments',
    label: 'Biens',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/><path d="M10 21v-3h4v3"/>
      </svg>
    ),
  },
  {
    href: '/tenants',
    label: 'Locataires',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3.2"/><path d="M3 20c.7-3.4 3.2-5 6-5s5.3 1.6 6 5"/><circle cx="17" cy="9" r="2.6"/><path d="M21 19c-.4-2.4-2-3.6-4-3.8"/>
      </svg>
    ),
  },
  {
    href: '/rents',
    label: 'Paiements',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 6.5A6 6 0 0 0 7 12a6 6 0 0 0 10 5.5"/><path d="M5 10h8M5 13.5h8"/>
      </svg>
    ),
  },
  {
    href: '/stats',
    label: 'Charges',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 3h14v18l-2.5-1.5L14 21l-2.5-1.5L9 21l-2.5-1.5L4 21V3"/><path d="M8 8h8M8 12h8M8 16h5"/>
      </svg>
    ),
  },
  {
    href: '/agenda',
    label: 'Calendrier',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3.5" y="5" width="17" height="15" rx="1.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>
      </svg>
    ),
  },
];

const MORE_ITEMS = [
  { href: '/leases',               label: 'Baux' },
  { href: '/buildings',            label: 'Immeubles' },
  { href: '/travaux',              label: 'Travaux' },
  { href: '/reconciliation',       label: 'Banque' },
  { href: '/global-ged',           label: 'GED' },
  { href: '/companies',            label: 'Sociétés' },
  { href: '/gestion/parametres',   label: 'Paramètres' },
  { href: '/settings/security',    label: 'Sécurité' },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-brand-name">RentMaestro</span>
          <span className="sidebar-brand-dot" />
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-item${isActive(item.href) ? ' active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
              <span className="sidebar-dot" />
            </Link>
          ))}

          <div className="sidebar-divider" />

          {MORE_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-item${isActive(item.href) ? ' active' : ''}`}
              style={{ fontSize: 12, color: 'var(--text-muted)' }}
            >
              <span>{item.label}</span>
              <span className="sidebar-dot" />
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">RM</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">Admin</div>
              <div className="sidebar-user-role">Bailleur</div>
            </div>
          </div>
          <button className="sidebar-logout" onClick={handleLogout}>
            ↪ Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile overlay menu */}
      <div
        className={`mobile-nav-overlay${mobileOpen ? ' open' : ''}`}
        onClick={() => setMobileOpen(false)}
      />
      <div className={`mobile-nav-menu${mobileOpen ? ' open' : ''}`}>
        <div className="mobile-menu-header">Menu</div>

        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-nav-link${isActive(item.href) ? ' active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}

        <div className="sidebar-divider" style={{ margin: '8px 0' }} />

        {MORE_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-nav-link${isActive(item.href) ? ' active' : ''}`}
            onClick={() => setMobileOpen(false)}
            style={{ fontSize: 12 }}
          >
            <span>{item.label}</span>
          </Link>
        ))}

        <button
          onClick={() => { setMobileOpen(false); handleLogout(); }}
          className="mobile-nav-link"
          style={{ marginTop: 'auto', color: 'var(--error)', borderColor: 'rgba(248,113,113,.25)', background: 'rgba(248,113,113,.06)' }}
        >
          ↪ Déconnexion
        </button>
      </div>

      {/* Mobile bottom tab bar */}
      <BottomNav onMoreClick={() => setMobileOpen(true)} />
    </>
  );
}
