import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "GiziSmile — Pemantauan Stunting & Rekomendasi Gizi Presisi",
  description:
    "Platform PWA penjembatan data antropometri balita baku WHO Z-Score dengan harga pangan lokal untuk rekomendasi resep gizi cerdas presisi.",
  manifest: "/manifest.json",
  icons: {
    icon: "/Logo_GiziSmile.svg",
    shortcut: "/Logo_GiziSmile.svg",
    apple: "/Logo_GiziSmile.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.className} antialiased selection:bg-emerald-500/20`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <PwaRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
