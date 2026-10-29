import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getChildren } from "@/actions/children";
import { getParentsList } from "@/actions/staff";
import { ChildrenClientView } from "@/components/children/ChildrenClientView";
import { Baby } from "lucide-react";

export const metadata = {
  title: "Data Balita Posyandu — GiziSmile",
  description: "Daftar rekam medis dan histori antropometri balita binaan posyandu.",
};

async function ChildrenContent() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userRole: string | undefined = undefined;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    userRole = profile?.role || (user.user_metadata?.role as string);
  }

  const [childrenRes, parentsRes] = await Promise.all([
    getChildren(),
    ["kader", "nutritionist", "admin"].includes(userRole || "")
      ? getParentsList()
      : Promise.resolve({ data: [] }),
  ]);

  // Hanya kader, nutritionist, dan admin yang dapat menambah balita
  const canManage = !userRole || ["kader", "nutritionist", "admin"].includes(userRole);

  return (
    <ChildrenClientView
      initialChildren={childrenRes.data || []}
      initialParents={parentsRes.data || []}
      canManage={canManage}
    />
  );
}

export default function ChildrenPage() {
  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="border-b pb-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Baby className="w-5 h-5 text-emerald-600" />
          Data Rekam Medis Balita Posyandu
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Pantau riwayat antropometri, status gizi per balita, dan intervensi resep gizi terintegrasi.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="h-48 flex items-center justify-center text-xs text-muted-foreground animate-pulse border rounded-lg bg-muted/20">
            Memuat Rekam Medis Balita Posyandu...
          </div>
        }
      >
        <ChildrenContent />
      </Suspense>
    </div>
  );
}
