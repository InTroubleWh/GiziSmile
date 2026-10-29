import Link from "next/link";
import Image from "next/image";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SimulateOfflineButton } from "@/components/common/SimulateOfflineButton";
import {
  Calculator,
  UtensilsCrossed,
  BarChart3,
  WifiOff,
  Sparkles,
  ArrowRight,
  Users,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header Navigasi */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-1.5 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
              <Image
                src="/Logo_GiziSmile.svg"
                alt="Logo GiziSmile"
                width={36}
                height={36}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <span>
              Gizi<span className="text-emerald-600 dark:text-emerald-400">Smile</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/z-score" className="hover:text-foreground transition-colors">
              Kalkulator Z-Score
            </Link>
            <Link href="/recipes" prefetch={false} className="hover:text-foreground transition-colors">
              Resep Gizi Cerdas
            </Link>
            <Link href="/analytics" prefetch={false} className="hover:text-foreground transition-colors">
              Analitik Wilayah
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <Link href="/auth/login">
              <Button size="sm" className="h-9 text-xs font-semibold gap-1.5">
                Masuk (1-Click Demo)
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Bagian Hero Utama */}
      <section className="relative py-16 md:py-24 px-4 sm:px-6 max-w-7xl mx-auto w-full text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-muted/60 text-xs font-medium text-muted-foreground">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Platform PWA Pemantauan Stunting &amp; Ketahanan Gizi Posyandu</span>
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight">
          Deteksi Dini Stunting Baku WHO &amp;{" "}
          <span className="text-emerald-600 dark:text-emerald-400 underline decoration-emerald-500/30">
            Resep Gizi Cerdas
          </span>{" "}
          Berbasis Pasar
        </h1>

        <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Menjembatani perhitungan kurva pertumbuhan anak (TB/U, BB/U, BB/TB) dengan harga komoditas pangan lokal
          terjangkau (&lt; Rp6.000/porsi), lengkap dengan ketahanan mode luring (*offline*) saat kader berada di daerah blank spot.
        </p>

        {/* Tombol Call to Action */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <Link href="/z-score">
            <Button size="lg" className="h-11 px-6 font-semibold gap-2 shadow-md">
              <Calculator className="w-4 h-4" />
              Uji Kalkulator Z-Score
            </Button>
          </Link>

          <Link href="/recipes" prefetch={false}>
            <Button size="lg" variant="outline" className="h-11 px-6 font-semibold gap-2">
              <UtensilsCrossed className="w-4 h-4 text-emerald-600" />
              Katalog Resep Gizi
            </Button>
          </Link>

          <Link href="/auth/login">
            <Button size="lg" variant="secondary" className="h-11 px-6 font-semibold gap-2">
              <Users className="w-4 h-4" />
              1-Click Demo Juri
            </Button>
          </Link>
        </div>
      </section>

      {/* 3 Fitur Inti (F1, F2, F3) */}
      <section className="py-12 px-4 sm:px-6 max-w-7xl mx-auto w-full border-t">
        <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Tiga Solusi Kunci Menjawab Masalah Nyata di Lapangan
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Dirancang spesifik untuk kebutuhan Kader Posyandu, Orang Tua Balita, dan Ahli Gizi Puskesmas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* F1 */}
          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Calculator className="w-5 h-5" />
              </div>
              <CardTitle className="text-base font-bold">1. Kalkulator WHO Z-Score</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Menghitung otomatis 3 indikator baku (TB/U, BB/U, BB/TB) dari parameter LMS WHO, dilengkapi grafik kurva interaktif dan peringatan dini instan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/z-score" className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1">
                Buka Kalkulator Antropometri <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </CardContent>
          </Card>

          {/* F2 */}
          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <CardTitle className="text-base font-bold">2. Resep Gizi Cerdas Pasar</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Rekomendasi menu pangan lokal padat protein dan zat besi (ikan lele, hati ayam, tempe, daun kelor) dengan estimasi biaya presisi per porsi.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/recipes" prefetch={false} className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
                Eksplorasi Resep Gizi <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </CardContent>
          </Card>

          {/* F3 */}
          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <CardTitle className="text-base font-bold">3. Analitik Wilayah &amp; Cetak</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Agregasi visual perbandingan kasus normal vs stunting per desa, dilengkapi tombol cetak laporan resmi yang bersih untuk evaluasi lintas sektor.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/analytics" prefetch={false} className="text-xs font-semibold text-purple-600 hover:underline flex items-center gap-1">
                Lihat Dashboard Wilayah <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Bagian Keunggulan Offline / PWA */}
      <section className="py-12 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="rounded-2xl border bg-card p-6 sm:p-10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              <WifiOff className="w-3.5 h-3.5" />
              <span>Ketahanan Mode Luring Penuh (Offline-First)</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Tetap Berfungsi Penuh Saat Bertugas di Wilayah Pelosok
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Kader posyandu dapat menginput data, menghitung Z-score seketika, dan melihat kurva pertumbuhan tanpa bergantung pada sinyal internet. Antrean disimpan secara aman di peramban dan disinkronkan ke cloud dengan satu klik saat kembali terhubung.
            </p>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <SimulateOfflineButton />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t py-8 px-4 sm:px-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© 2026 GiziSmile — Tim KABEL ARYA KEBAKAR (Muhammad Kemal Syah Rafi &amp; Muhammad Ervin Fadillah).</p>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="hover:underline">
              Demo Login
            </Link>
            <Link href="/z-score" className="hover:underline">
              Kalkulator
            </Link>
            <Link href="/recipes" prefetch={false} className="hover:underline">
              Resep Gizi
            </Link>
            <Link href="/analytics" prefetch={false} className="hover:underline">
              Analitik
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
