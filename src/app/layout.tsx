import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { DM_Serif_Display, Inter } from "next/font/google";
import { getServerEnv } from "@/lib/env";
import { AuthTestBanner } from "@/components/AuthTestBanner";
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
};

export const metadata: Metadata = {
  title: "DEMOSTRATIVO MTD • Plataforma Educacional de Inglês",
  description:
    "Plataforma educacional exclusiva de inglês baseada no Método Paulo. Dashboards demonstrativos para Alunos e Administradores com alta fidelidade visual.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let isAuthTest = false;
  try {
    const env = getServerEnv();
    isAuthTest = env.isAuthTestWithLocalData;
  } catch {
    // Modo seguro se variáveis não estiverem inicializadas
  }

  return (
    <html lang="pt-BR">
      <body
        className={`${inter.variable} ${dmSerif.variable} ${geistSans.variable} ${geistMono.variable} font-sans antialiased selection:bg-[#5B2FE8] selection:text-white`}
      >
        {isAuthTest && <AuthTestBanner />}
        {children}
      </body>
    </html>
  );
}
