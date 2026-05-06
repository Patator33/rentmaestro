'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface BottomNavProps {
  onMoreClick: () => void;
}

const TABS = [
  {
    href: '/',
    label: 'Home',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/>
      </svg>
    ),
  },
  {
    href: '/apartments',
    label: 'Biens',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/><path d="M10 21v-3h4v3"/>
      </svg>
    ),
  },
  {
    href: '/tenants',
    label: 'Loc.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3.2"/><path d="M3 20c.7-3.4 3.2-5 6-5s5.3 1.6 6 5"/><circle cx="17" cy="9" r="2.6"/><path d="M21 19c-.4-2.4-2-3.6-4-3.8"/>
      </svg>
    ),
  },
  {
    href: '/rents',
    label: 'Loyers',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 6.5A6 6 0 0 0 7 12a6 6 0 0 0 10 5.5"/><path d="M5 10h8M5 13.5h8"/>
      </svg>
    ),
  },
];

export default function BottomNav({ onMoreClick }: BottomNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
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
          <span className="bottom-nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/>
            </svg>
          </span>
          <span className="bottom-nav-label">Plus</span>
        </button>
      </div>
    </nav>
  );
}
