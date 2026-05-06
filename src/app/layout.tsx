import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import NavBarWrapper from "@/components/NavBarWrapper";
import { ToastProvider } from "@/components/Toast";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import RefreshOnFocus from "@/components/RefreshOnFocus";
import { THEME_COOKIE, DEFAULT_THEME } from "@/themes/index";
import "./globals.css";

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
  const theme = (await cookies()).get(THEME_COOKIE)?.value ?? DEFAULT_THEME;
  return (
    <html lang="fr" data-theme={theme}>
      <body className={`${inter.variable} ${jetbrainsMono.variable}`}>
        <ToastProvider>
          <ServiceWorkerRegistration />
          <RefreshOnFocus />
          <div className="app-shell">
            <NavBarWrapper />
            <main className="main-content page-enter">
              {children}
            </main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
