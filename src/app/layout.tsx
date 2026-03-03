import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import NavBarWrapper from "@/components/NavBarWrapper";
import { ToastProvider } from "@/components/Toast";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2b8cee",
};

export const metadata: Metadata = {
  title: "Rentmaestro — Gestion Locative",
  description: "Gérez vos investissements locatifs avec élégance. Suivi des appartements, locataires, baux et loyers.",
  keywords: ["gestion locative", "loyers", "appartements", "locataires", "baux"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rentmaestro",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${manrope.variable}`}>
        <ToastProvider>
          <ServiceWorkerRegistration />
          <NavBarWrapper />
          <main className="main-content">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
