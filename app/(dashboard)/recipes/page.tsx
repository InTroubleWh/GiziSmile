import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getChildren } from "@/actions/children";
import { getRecipes, getCommoditiesWithNutrition } from "@/actions/recipes";
import { getCurrentUserRole } from "@/actions/staff";
import { RecipesClient } from "@/components/recipes/RecipesClient";
import { UtensilsCrossed, ShoppingBag } from "lucide-react";

export const metadata = {
  title: "Resep Gizi Cerdas Berbasis Pasar — GiziSmile",
  description: "Rekomendasi menu pangan lokal padat gizi ekonomis untuk intervensi stunting dan wasting.",
};

async function RecipesContent({
  searchParams,
}: {
  searchParams: Promise<{ child_id?: string; category?: string }>;
}) {
  await connection();
  const resolvedParams = await searchParams;
  const childId = resolvedParams.child_id;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [recipesRes, commoditiesRes, childrenRes, userRole] = await Promise.all([
    getRecipes(),
    getCommoditiesWithNutrition(),
    getChildren(),
    getCurrentUserRole(),
  ]);

  return (
    <RecipesClient
      initialRecipes={recipesRes.data || []}
      commodities={commoditiesRes.data || []}
      childrenList={childrenRes.data || []}
      userRole={userRole}
      currentUserId={user?.id}
      selectedChildId={childId}
    />
  );
}

export default function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ child_id?: string; category?: string }>;
}) {
  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-emerald-600" />
            Resep Gizi Cerdas Berbasis Pasar Hari Ini
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Menu presisi tinggi nutrisi, bahan lokal terjangkau (&lt; Rp6.000/porsi), dan teruji klinis berbasis tabel gizi.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md border w-fit">
          <ShoppingBag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Tabel Gizi Komoditas Terintegrasi</span>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="h-64 flex items-center justify-center text-xs text-muted-foreground animate-pulse border rounded-lg bg-muted/20">
            Meracik Menu Resep Gizi Berdasarkan Pasar...
          </div>
        }
      >
        <RecipesContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
