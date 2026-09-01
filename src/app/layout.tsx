import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import NavBarWrapper from "@/components/NavBarWrapper";
import PageAccentBar from "@/components/PageAccentBar";
import { ToastProvider } from "@/components/Toast";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import RefreshOnFocus from "@/components/RefreshOnFocus";
import { THEME_COOKIE, DEFAULT_THEME } from "@/themes/index";
import { NAV_COLORS } from "@/lib/nav-colors";
import { prisma } from "@/lib/prisma";
import "./globals.css";

// Pose les variables couleur du menu avant la première peinture, d'après l'URL,
// pour éviter tout flash de couleur au chargement (même principe que le thème SSR).
const PAGE_ACCENT_SCRIPT = `(function(){try{
var p=location.pathname,M=${JSON.stringify(NAV_COLORS)},c=null,n=-1;
if(p.indexOf('/portal')===0||p.indexOf('/login')===0||p==='/setup')return;
for(var i=0;i<M.length;i++){var h=M[i][0];if(h==='/'?p==='/':p.indexOf(h)===0){if(h.length>n){n=h.length;c=M[i][1];}}}
if(c){var r=document.documentElement.style;
r.setProperty('--page-accent',c);r.setProperty('--page-tint',c);
r.setProperty('--pill-ok-color',c);
r.setProperty('--pill-ok-bg','color-mix(in srgb, '+c+' 12%, transparent)');
r.setProperty('--pill-ok-border','color-mix(in srgb, '+c+' 30%, transparent)');}
}catch(e){}})();`;

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0e0f12",
};

export const metadata: Metadata = {
  title: "RentMaestro — Gestion Locative",
  description: "Gérez vos investissements locatifs avec élégance. Suivi des appartements, locataires, baux et loyers.",
  keywords: ["gestion locative", "loyers", "appartements", "locataires", "baux"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RentMaestro",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [dbTheme, cookieStore] = await Promise.all([
    prisma.setting.findUnique({ where: { key: 'theme' } }),
    cookies(),
  ]);
  const theme = dbTheme?.value ?? cookieStore.get(THEME_COOKIE)?.value ?? DEFAULT_THEME;
  return (
    <html lang="fr" data-theme={theme}>
      <body className={`${inter.variable} ${jetbrainsMono.variable}`}>
        <script dangerouslySetInnerHTML={{ __html: PAGE_ACCENT_SCRIPT }} />
        <ToastProvider>
          <ServiceWorkerRegistration />
          <RefreshOnFocus />
          <div className="app-shell">
            <NavBarWrapper />
            <main className="main-content page-enter">
              <PageAccentBar />
              {children}
            </main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
