import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { DM_Serif_Display, Inter } from "next/font/google";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import { PwaInstallPrompt } from "@/components/pwa/PwaInstallPrompt";
import { I18nProvider } from "@/lib/i18n/LanguageContext";
import "./globals.css";

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#080a19",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Juno Academy • Plataforma Educacional de Idiomas",
  description:
    "Plataforma educacional de idiomas Juno Academy. Portal completo para Alunos, Professores e Coordenação.",
  applicationName: "Juno Academy",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Juno Academy",
    startupImage: [
      {
        url: "/icons/icon-512.png",
      },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${inter.variable} ${dmSerif.variable} ${geistSans.variable} ${geistMono.variable} font-sans antialiased selection:bg-[#5B2FE8] selection:text-white`}
      >
        <I18nProvider>
          <PwaRegister />
          {children}
          <PwaInstallPrompt />
        </I18nProvider>
      </body>
    </html>
  );
}
