import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope/wght.css";
import "./globals.css";

// Contenus administrables : rendu à la demande (aucune requête base pendant le build).
export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Génie des Lycées ORATHON — Concours national d'éloquence", template: "%s · Génie des Lycées ORATHON" },
  description:
    "Le concours national d'éloquence et de plaidoirie des lycéens et étudiants du Togo, organisé par l'AJ3C. Candidats, établissements, vote du public, palmarès, photos et vidéos.",
  applicationName: "Génie des Lycées ORATHON",
  openGraph: {
    type: "website",
    locale: "fr_TG",
    siteName: "Génie des Lycées ORATHON",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Génie des Lycées ORATHON" }],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#10338b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
