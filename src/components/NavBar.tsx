'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import GlobalSearch from "@/components/GlobalSearch";
import Logo from "@/components/Logo";

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

// Icônes au même gabarit que NAV_ITEMS : sans elles, les libellés de cette
// section démarraient plus à gauche que ceux du haut.
const icon = (paths: React.ReactNode) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {paths}
  </svg>
);

const MORE_ITEMS = [
  {
    href: '/leases', label: 'Baux',
    icon: icon(<><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5" /><path d="M9 13h7M9 17h5" /></>),
  },
  {
    href: '/buildings', label: 'Immeubles',
    icon: icon(<><rect x="3" y="7" width="8" height="14" rx="1" /><rect x="13" y="3" width="8" height="18" rx="1" /><path d="M6 11h2M6 15h2M16 7h2M16 11h2M16 15h2" /></>),
  },
  {
    href: '/travaux', label: 'Travaux',
    icon: icon(<><path d="M14.7 6.3a4 4 0 0 1-5 5L5 16v3h3l4.7-4.7a4 4 0 0 0 5-5z" /></>),
  },
  {
    href: '/reconciliation', label: 'Banque',
    icon: icon(<><path d="M3 10 12 4l9 6" /><path d="M5 10v9M19 10v9M9 10v9M15 10v9" /><path d="M3 21h18" /></>),
  },
  {
    href: '/global-ged', label: 'GED',
    icon: icon(<><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>),
  },
  {
    href: '/companies', label: 'Sociétés',
    icon: icon(<><rect x="4" y="4" width="16" height="16" rx="1.5" /><path d="M8 9h3M13 9h3M8 13h3M13 13h3M10 20v-3h4v3" /></>),
  },
  {
    href: '/gestion/parametres', label: 'Paramètres',
    icon: icon(<><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" /></>),
  },
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
          <Logo size={22} />
          <span className="sidebar-brand-name">RentMaestro</span>
          <span className="sidebar-brand-dot" />
        </div>

        <div style={{ padding: '0 8px 8px' }}>
          <GlobalSearch />
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Principal</div>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-item${isActive(item.href) ? ' active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}

          <div className="sidebar-section-label">Gestion</div>
          {MORE_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-item${isActive(item.href) ? ' active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
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

        <div style={{ padding: '0 8px 8px' }}>
          <GlobalSearch />
        </div>

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
          >
            {item.icon}
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
