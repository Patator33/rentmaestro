'use client';

import { Manrope } from "next/font/google";
import Link from "next/link";
import Logo from "@/components/Logo";
import { useState } from "react";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [menuOpen, setMenuOpen] = useState(false);

  const NAV_ITEMS = [
    { href: "/", label: "🏠 Accueil" },
    { href: "/apartments", label: "🏢 Appartements" },
    { href: "/tenants", label: "👥 Locataires" },
    { href: "/leases", label: "📜 Baux" },
    { href: "/rents", label: "💰 Loyers" },
    { href: "/stats", label: "📈 Stats" },
  ];

  return (
    <html lang="fr">
      <body className={`${manrope.variable}`}>
        <nav className="main-nav">
          <div className="nav-content">
            <Link href="/" className="nav-home-link">
              <Logo size={32} />
              <span>Rentmaestro</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="desktop-nav">
              {NAV_ITEMS.map((item) => (
                <Link key={item.href} href={item.href} className="nav-link">
                  {item.label}
                </Link>
              ))}
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
        </div>
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
