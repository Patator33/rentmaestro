'use client';

import { Inter } from "next/font/google";
import Link from "next/link";
import Logo from "@/components/Logo";
import { useState } from "react";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <html lang="fr">
      <body className={`${inter.variable}`}>
        <nav className="main-nav">
          <div className="nav-content">
            <Link href="/" className="nav-home-link">
              <Logo size={32} />
              <span>Rentmaestro</span>
            </Link>
            <button
              className="nav-toggle"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              {menuOpen ? '✕' : '☰'}
            </button>
            <div className={`nav-links ${menuOpen ? 'nav-links-open' : ''}`}>
              <Link href="/" className="nav-link" onClick={() => setMenuOpen(false)}>🏠 Accueil</Link>
              <Link href="/apartments" className="nav-link" onClick={() => setMenuOpen(false)}>🏢 Appartements</Link>
              <Link href="/tenants" className="nav-link" onClick={() => setMenuOpen(false)}>👥 Locataires</Link>
              <Link href="/leases" className="nav-link" onClick={() => setMenuOpen(false)}>📜 Baux</Link>
              <Link href="/rents" className="nav-link" onClick={() => setMenuOpen(false)}>💰 Loyers</Link>
              <Link href="/stats" className="nav-link" onClick={() => setMenuOpen(false)}>📈 Stats</Link>
            </div>
          </div>
        </nav>
        {menuOpen && <div className="nav-overlay" onClick={() => setMenuOpen(false)}></div>}
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
