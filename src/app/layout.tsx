import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import "./globals.css";
import { FutStoreProvider } from "@/lib/store";
import { AppShell } from "@/components/layout/BottomNav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FUT Pachangas — Club Amateur",
  description:
    "Cartas coleccionables Ultimate Team, equipos balanceados, votaciones MVP y rankings históricos para tu grupo de fútbol.",
};

export const viewport: Viewport = {
  themeColor: "#090D16",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${barlowCondensed.variable} dark`}
    >
      <body className="antialiased">
        <FutStoreProvider>
          <AppShell>{children}</AppShell>
        </FutStoreProvider>
      </body>
    </html>
  );
}
