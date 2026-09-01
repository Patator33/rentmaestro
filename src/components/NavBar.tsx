'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useState } from "react";
import BottomNav from "@/components/BottomNav";
import GlobalSearch from "@/components/GlobalSearch";
import Logo from "@/components/Logo";
import { NAV_ITEMS, MORE_ITEMS } from "@/components/nav-items";

// Couleurs à garder synchronisées avec src/lib/nav-colors.ts (script anti-flash).

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
              style={{ '--item-color': item.color } as React.CSSProperties}
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
              style={{ '--item-color': item.color } as React.CSSProperties}
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
            style={{ '--item-color': item.color } as React.CSSProperties}
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
            style={{ '--item-color': item.color } as React.CSSProperties}
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
