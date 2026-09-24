import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const body = Atkinson_Hyperlegible_Next({ variable: "--font-body", subsets: ["latin"], display: "swap" });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], display: "swap" });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });

export const metadata: Metadata = {
  title: "Objely École · Administration",
  description: "Espace de gestion des objets perdus et trouvés pour les établissements scolaires.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${body.variable} ${bricolage.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
