import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getStaffList, getAllRoleRequests } from "@/actions/staff";
import { AdminUsersClient } from "@/components/admin/AdminUsersClient";
import { ShieldAlert, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Kelola Akun & Permohonan Peran — Panel Admin GiziSmile",
  description: "Pendaftaran petugas, manajemen hak akses, dan verifikasi permohonan perubahan peran kader/ahli gizi.",
};

async function AdminUsersContent() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const userRole = profile?.role || (user.user_metadata?.role as string);

  // Guard rute: Jika bukan admin, tolak akses dan arahkan ke dashboard
  if (userRole !== "admin") {
    redirect("/z-score");
  }

  const [staffRes, requestsRes] = await Promise.all([
    getStaffList(),
    getAllRoleRequests(),
  ]);

  if (staffRes.error) {
    return (
      <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-xs text-destructive flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 shrink-0" />
        <span>{staffRes.error}</span>
      </div>
    );
  }

  return (
    <AdminUsersClient
      initialStaffList={staffRes.data || []}
      initialRoleRequests={requestsRes.data || []}
      currentUserId={user.id}
    />
  );
}

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-rose-600" />
            Manajemen Akun Petugas Posyandu &amp; Puskesmas
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Khusus Administrator: Daftarkan akun baru untuk Kader Posyandu dan Ahli Gizi, serta kontrol hak akses data stunting.
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="h-64 flex items-center justify-center text-xs text-muted-foreground animate-pulse border rounded-lg bg-muted/20">
            Memuat Data Staf &amp; Petugas...
          </div>
        }
      >
        <AdminUsersContent />
      </Suspense>
    </div>
  );
}
