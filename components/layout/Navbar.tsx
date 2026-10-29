"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { LogoutButton } from "@/components/logout-button";
import { Menu, X, Settings, LogIn, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getCachedUser } from "@/lib/offline";

const BASE_NAV_ITEMS = [
  { href: "/z-score", label: "Kalkulator Z-Score", requiresAuth: false },
  { href: "/recipes", label: "Resep Gizi Cerdas", requiresAuth: true },
  { href: "/children", label: "Data Balita", requiresAuth: true },
  { href: "/analytics", label: "Analitik Wilayah", requiresAuth: true },
];

export function Navbar({
  userRole,
  userEmail,
  userFullName,
  isAuthenticated,
}: {
  userRole?: string;
  userEmail?: string;
  userFullName?: string;
  isAuthenticated?: boolean;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hasAccount, setHasAccount] = useState<boolean>(() => {
    return Boolean(isAuthenticated || userEmail || userRole);
  });

  useEffect(() => {
    if (isAuthenticated || userEmail || userRole) {
      setHasAccount(true);
      return;
    }
    const cached = getCachedUser();
    if (cached && (cached.id || cached.email || cached.role)) {
      setHasAccount(true);
    } else {
      setHasAccount(false);
    }
  }, [isAuthenticated, userEmail, userRole]);

  const navItems = [
    ...BASE_NAV_ITEMS,
    ...(userRole === "admin" ? [{ href: "/admin/users", label: "Kelola Petugas", requiresAuth: true }] : []),
  ];

  const getRoleBadge = (role?: string) => {
    if (!hasAccount) {
      return (
        <span className="text-[11px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full border border-border">
          Mode Tamu
        </span>
      );
    }

    switch (role) {
      case "admin":
        return <span className="text-[11px] font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30">Administrator</span>;
      case "kader":
        return <span className="text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">Kader Posyandu</span>;
      case "nutritionist":
        return <span className="text-[11px] font-semibold bg-blue-500/15 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">Ahli Gizi Puskesmas</span>;
      case "parent":
        return <span className="text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">Orang Tua</span>;
      default:
        return <span className="text-[11px] font-semibold bg-primary/15 text-primary px-2 py-0.5 rounded-full border border-primary/30">Petugas</span>;
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        {/* Brand & Logo */}
        <div className="flex items-center gap-6">
          <Link href="/z-score" className="flex items-center gap-2.5 font-bold text-base tracking-tight text-foreground hover:opacity-90">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-1.5 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
              <Image
                src="/Logo_GiziSmile.svg"
                alt="Logo GiziSmile"
                width={32}
                height={32}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <span>Gizi<span className="text-emerald-600 dark:text-emerald-400">Smile</span></span>
          </Link>

          {/* Nav Links Desktop */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-medium">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const isLocked = !hasAccount && item.requiresAuth;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${isActive
                    ? "bg-accent text-accent-foreground font-semibold"
                    : isLocked
                      ? "text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  title={isLocked ? "Perlu masuk akun untuk mengakses fitur ini" : undefined}
                >
                  <span>{item.label}</span>
                  {isLocked && <Lock className="w-3 h-3 text-muted-foreground/50" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Status & Actions */}
        <div className="flex items-center gap-2.5">
          {hasAccount ? (
            <Link
              href="/settings/account"
              className="hidden sm:flex items-center gap-2 text-xs p-1.5 rounded-md hover:bg-muted/60 transition-colors group"
              title="Pengaturan Akun & Profil"
            >
              {getRoleBadge(userRole)}
              <span className="font-medium text-foreground text-xs group-hover:text-primary transition-colors max-w-[140px] truncate">
                {userFullName || userEmail || "Petugas"}
              </span>
              <Settings className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              {getRoleBadge()}
              <span className="text-xs text-muted-foreground font-medium">Kalkulator Mandiri</span>
            </div>
          )}

          <ThemeSwitcher />

          <div className="hidden sm:block">
            {hasAccount ? (
              <LogoutButton />
            ) : (
              <Link href="/login">
                <Button size="sm" className="h-8 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <LogIn className="w-3.5 h-3.5" />
                  Masuk Akun
                </Button>
              </Link>
            )}
          </div>

          {/* Tombol Hamburger Mobile */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden h-8 w-8 p-0"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle Menu"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Navigasi Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t p-4 space-y-3 bg-background">
          <nav className="flex flex-col gap-1 text-sm font-medium">
            {navItems.map((item) => {
              const isLocked = !hasAccount && item.requiresAuth;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`p-2 rounded-md flex items-center justify-between ${pathname === item.href
                    ? "bg-accent font-semibold text-accent-foreground"
                    : isLocked
                      ? "text-muted-foreground/60"
                      : "text-muted-foreground"
                    }`}
                >
                  <span>{item.label}</span>
                  {isLocked && <Lock className="w-3.5 h-3.5 text-muted-foreground/50" />}
                </Link>
              );
            })}
            {hasAccount && (
              <Link
                href="/settings/account"
                onClick={() => setMobileOpen(false)}
                className={`p-2 rounded-md flex items-center justify-between ${pathname === "/settings/account" ? "bg-accent font-semibold text-accent-foreground" : "text-muted-foreground"
                  }`}
              >
                <span>Pengaturan Akun</span>
                <Settings className="w-3.5 h-3.5" />
              </Link>
            )}
          </nav>

          <div className="pt-3 border-t flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getRoleBadge(userRole)}
              <span className="text-xs font-medium text-foreground truncate max-w-[120px]">
                {hasAccount ? userFullName || userEmail : "Tamu"}
              </span>
            </div>
            {hasAccount ? (
              <LogoutButton />
            ) : (
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                <Button size="sm" className="h-8 text-xs font-semibold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <LogIn className="w-3.5 h-3.5" />
                  Masuk
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
