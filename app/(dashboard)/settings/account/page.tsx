import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentProfile, getMyRoleRequests } from "@/actions/staff";
import { AccountSettingsClient } from "@/components/settings/AccountSettingsClient";
import { Settings } from "lucide-react";

export const metadata = {
  title: "Pengaturan Akun & Profil — GiziSmile",
  description: "Ubah nama profil dan ajukan permohonan peran petugas Posyandu/Puskesmas.",
};

async function AccountSettingsContent() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { profile, email } = await getCurrentProfile();
  const { data: requests } = await getMyRoleRequests();

  return (
    <AccountSettingsClient
      initialProfile={profile}
      initialEmail={email}
      initialRequests={requests || []}
    />
  );
}

export default function AccountSettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="border-b pb-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          Pengaturan Akun &amp; Identitas Profil
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Kelola nama tampilan profil publik dan ajukan perubahan hak akses petugas stunting.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="h-64 flex items-center justify-center text-xs text-muted-foreground animate-pulse border rounded-lg bg-muted/20">
            Memuat Pengaturan Akun...
          </div>
        }
      >
        <AccountSettingsContent />
      </Suspense>
    </div>
  );
}
