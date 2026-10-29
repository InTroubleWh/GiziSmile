"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCachedUser } from "@/lib/offline";

interface OfflineAuthGuardProps {
  serverAuthenticated?: boolean;
}

export function OfflineAuthGuard({ serverAuthenticated }: OfflineAuthGuardProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Rute yang bebas diakses tanpa akun
    const isPublic =
      pathname === "/z-score" ||
      pathname === "/" ||
      pathname.startsWith("/auth");

    if (isPublic) return;

    // Cek apakah ada sesi user server atau user yang tersimpan di cache lokal
    const cachedUser = getCachedUser();
    const hasAccount = Boolean(serverAuthenticated || (cachedUser && (cachedUser.id || cachedUser.email || cachedUser.role)));

    if (!hasAccount) {
      // Alihkan pengguna tamu/luring tanpa akun kembali ke kalkulator Z-score
      router.replace("/z-score");
    }
  }, [pathname, router, serverAuthenticated]);

  return null;
}

