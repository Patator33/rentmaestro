import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import NavBar from "@/components/NavBar";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rentmaestro — Gestion Locative",
  description: "Gérez vos investissements locatifs avec élégance. Suivi des appartements, locataires, baux et loyers.",
  keywords: ["gestion locative", "loyers", "appartements", "locataires", "baux"],
  manifest: "/manifest.json",
  themeColor: "#2b8cee",
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
          <NavBar />
          <main>
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
