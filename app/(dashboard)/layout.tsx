import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { OfflineHydrator } from "@/components/providers/OfflineHydrator";
import { OfflineAuthGuard } from "@/components/providers/OfflineAuthGuard";
import { getChildren } from "@/actions/children";
import { getRecipes, getCommoditiesWithNutrition } from "@/actions/recipes";
import { getParentsList } from "@/actions/staff";

async function getDashboardUserInfo() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userRole: string | undefined = undefined;
  let userFullName: string | undefined = undefined;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .maybeSingle();
    userRole = profile?.role || (user.user_metadata?.role as string);
    userFullName = profile?.full_name || (user.user_metadata?.full_name as string);
  }
  return { userRole, userEmail: user?.email, userFullName, isAuthenticated: Boolean(user) };
}

async function HydratorContainer() {
  const { userRole, userEmail, userFullName } = await getDashboardUserInfo();
  const [childrenRes, recipesRes, commoditiesRes, parentsRes] = await Promise.all([
    getChildren(),
    getRecipes(),
    getCommoditiesWithNutrition(),
    ["kader", "nutritionist", "admin"].includes(userRole || "")
      ? getParentsList()
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <OfflineHydrator
      userRole={userRole}
      userEmail={userEmail}
      userFullName={userFullName}
      initialChildren={childrenRes.data || []}
      initialRecipes={recipesRes.data || []}
      initialCommodities={commoditiesRes.data || []}
      initialParents={parentsRes.data || []}
    />
  );
}

async function NavbarContainer() {
  const { userRole, userEmail, userFullName, isAuthenticated } = await getDashboardUserInfo();
  return (
    <Navbar
      userRole={userRole}
      userEmail={userEmail}
      userFullName={userFullName}
      isAuthenticated={isAuthenticated}
    />
  );
}

async function SidebarContainer() {
  const { userRole, isAuthenticated } = await getDashboardUserInfo();
  return <Sidebar userRole={userRole} isAuthenticated={isAuthenticated} />;
}

async function AuthGuardContainer() {
  const { isAuthenticated } = await getDashboardUserInfo();
  return <OfflineAuthGuard serverAuthenticated={isAuthenticated} />;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Route Guard Otomatis untuk Pengguna Tamu / Luring Tanpa Akun */}
      <Suspense fallback={null}>
        <AuthGuardContainer />
      </Suspense>

      {/* Client-side Offline Hydrator & Pre-cache Provider */}
      <Suspense fallback={null}>
        <HydratorContainer />
      </Suspense>

      {/* Banner Notifikasi Mode Offline & Sinkronisasi */}
      <OfflineBanner />

      {/* Header / Navbar Global dengan batas Suspense */}
      <Suspense fallback={<header className="h-14 border-b bg-background/95 w-full" />}>
        <NavbarContainer />
      </Suspense>

      {/* Konten Utama dengan Sidebar Responsif */}
      <div className="flex-1 flex">
        <Suspense fallback={<aside className="hidden lg:flex w-64 border-r bg-card p-4 min-h-[calc(100vh-3.5rem)] shrink-0" />}>
          <SidebarContainer />
        </Suspense>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
