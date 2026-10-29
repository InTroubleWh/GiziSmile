"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calculator, UtensilsCrossed, Baby, BarChart3, WifiOff, Users, Settings, Lock, LogIn } from "lucide-react";
import { useState, useEffect } from "react";
import { getCachedUser } from "@/lib/offline";
import { Button } from "@/components/ui/button";

const SIDEBAR_NAV = [
  {
    href: "/z-score",
    label: "Kalkulator Z-Score",
    icon: Calculator,
    desc: "Input antropometri & kurva WHO",
    requiresAuth: false,
  },
  {
    href: "/recipes",
    label: "Resep Gizi Cerdas",
    icon: UtensilsCrossed,
    desc: "Menu pangan lokal ekonomis",
    requiresAuth: true,
  },
  {
    href: "/children",
    label: "Data Balita",
    icon: Baby,
    desc: "Daftar rekam medis balita",
    requiresAuth: true,
  },
  {
    href: "/analytics",
    label: "Analitik Wilayah",
    icon: BarChart3,
    desc: "Sebaran stunting per desa",
    requiresAuth: true,
  },
];

export function Sidebar({
  userRole,
  isAuthenticated,
}: {
  userRole?: string;
  isAuthenticated?: boolean;
}) {
  const pathname = usePathname();
  const [hasAccount, setHasAccount] = useState<boolean>(() => {
    return Boolean(isAuthenticated || userRole);
  });

  useEffect(() => {
    if (isAuthenticated || userRole) {
      setHasAccount(true);
      return;
    }
    const cached = getCachedUser();
    if (cached && (cached.id || cached.email || cached.role)) {
      setHasAccount(true);
    } else {
      setHasAccount(false);
    }
  }, [isAuthenticated, userRole]);

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r bg-card p-4 space-y-6 shrink-0 min-h-[calc(100vh-3.5rem)]">
      <div className="space-y-1">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3">
          Menu Utama Posyandu
        </span>
        <nav className="space-y-1 pt-1">
          {SIDEBAR_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const isLocked = !hasAccount && item.requiresAuth;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-start gap-3 p-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : isLocked
                    ? "text-muted-foreground/60 hover:bg-muted/30"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                title={isLocked ? "Perlu masuk akun untuk mengakses fitur ini" : undefined}
              >
                <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold flex items-center justify-between">
                    <span>{item.label}</span>
                    {isLocked && <Lock className="w-3 h-3 text-muted-foreground/50 shrink-0" />}
                  </div>
                  <div className={`text-[10px] line-clamp-1 ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    {isLocked ? "Perlu masuk akun" : item.desc}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Pengaturan Akun & Profil (Hanya jika memiliki akun) */}
      {hasAccount && (
        <div className="space-y-1 pt-2 border-t">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3">
            Akun &amp; Preferensi
          </span>
          <nav className="space-y-1 pt-1">
            <Link
              href="/settings/account"
              className={`flex items-start gap-3 p-2.5 rounded-lg text-xs font-medium transition-all ${
                pathname === "/settings/account"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Settings className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="font-semibold">Pengaturan Akun</div>
                <div className={`text-[10px] line-clamp-1 ${pathname === "/settings/account" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  Ubah profil &amp; permohonan peran
                </div>
              </div>
            </Link>
          </nav>
        </div>
      )}

      {/* Bagian Khusus Administrator */}
      {hasAccount && userRole === "admin" && (
        <div className="space-y-1 pt-2 border-t">
          <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider px-3">
            Panel Administrator
          </span>
          <nav className="space-y-1 pt-1">
            <Link
              href="/admin/users"
              className={`flex items-start gap-3 p-2.5 rounded-lg text-xs font-medium transition-all ${
                pathname === "/admin/users"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Users className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="font-semibold">Kelola Akun &amp; Verifikasi</div>
                <div className={`text-[10px] line-clamp-1 ${pathname === "/admin/users" ? "text-white/80" : "text-muted-foreground"}`}>
                  Daftar Petugas &amp; Permohonan Peran
                </div>
              </div>
            </Link>
          </nav>
        </div>
      )}

      {/* Banner Ajakan Masuk Jika Masih Mode Tamu */}
      {!hasAccount && (
        <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-xs space-y-2">
          <div className="font-semibold text-foreground text-xs flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span>Akses Fitur Lengkap</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Masuk dengan akun Kader atau Ahli Gizi untuk mencatat rekam medis balita dan mendapatkan rekomendasi resep cerdas.
          </p>
          <Link href="/auth/login" className="block pt-1">
            <Button size="sm" className="w-full h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
              <LogIn className="w-3 h-3" />
              Masuk Sekarang
            </Button>
          </Link>
        </div>
      )}

      {/* Info Ketahanan Mode Offline */}
      <div className="mt-auto p-3 rounded-lg border bg-muted/40 text-xs space-y-1.5">
        <div className="flex items-center gap-1.5 font-semibold text-foreground text-[11px]">
          <WifiOff className="w-3.5 h-3.5 text-amber-500" />
          <span>Kesiapan Mode Luring</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Kalkulator antropometri tetap dapat digunakan tanpa sinyal internet. Data akan disimpan di browser.
        </p>
      </div>
    </aside>
  );
}
