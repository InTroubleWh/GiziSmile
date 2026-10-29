"use client";

import { useState, useMemo, useEffect } from "react";
import { SmartRecipe, DeficitCondition, generateSmartRecipes } from "@/lib/recipe-engine";
import { CommodityWithNutrition } from "@/actions/recipes";
import { ChildWithLatestMeasurement } from "@/actions/children";
import { deleteRecipe } from "@/actions/recipes";
import {
  getCachedRecipes,
  setCachedRecipes,
  getCachedCommodities,
  getCachedChildren,
  setCachedChildren,
} from "@/lib/offline";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { AddRecipeModal } from "@/components/recipes/AddRecipeModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  UtensilsCrossed,
  Plus,
  Users,
  Search,
  CheckCircle,
  AlertCircle,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Loader2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface RecipesClientProps {
  initialRecipes: SmartRecipe[];
  commodities: CommodityWithNutrition[];
  childrenList: ChildWithLatestMeasurement[];
  userRole: string | null;
  currentUserId?: string;
  selectedChildId?: string;
}

export function RecipesClient({
  initialRecipes,
  commodities,
  childrenList,
  userRole,
  currentUserId,
  selectedChildId,
}: RecipesClientProps) {
  const router = useRouter();
  const [recipesList, setRecipesList] = useState<SmartRecipe[]>(() => {
    if (initialRecipes.length > 0) return initialRecipes;
    const cached = getCachedRecipes();
    return cached.length > 0 ? cached : [];
  });

  const activeCommodities = useMemo(() => {
    if (commodities.length > 0) return commodities;
    return getCachedCommodities();
  }, [commodities]);

  const [activeChildrenList, setActiveChildrenList] = useState<ChildWithLatestMeasurement[]>(() => {
    if (childrenList.length > 0) return childrenList;
    return getCachedChildren();
  });

  useEffect(() => {
    if (childrenList.length > 0) {
      setActiveChildrenList(childrenList);
      setCachedChildren(childrenList);
    } else {
      const cached = getCachedChildren();
      if (cached.length > 0) {
        setActiveChildrenList(cached);
      }
    }
  }, [childrenList]);

  // Sync state if initialRecipes changes
  useEffect(() => {
    if (initialRecipes.length > 0) {
      setRecipesList(initialRecipes);
      setCachedRecipes(initialRecipes);
    } else {
      const cached = getCachedRecipes();
      if (cached.length > 0) {
        setRecipesList(cached);
      }
    }
  }, [initialRecipes]);

  const [activeChildId, setActiveChildId] = useState<string>(selectedChildId || "");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<SmartRecipe | null>(null);
  const [deletingRecipe, setDeletingRecipe] = useState<SmartRecipe | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const isNutritionistOrAdmin = userRole === "nutritionist" || userRole === "admin";

  // Temukan data anak yang sedang dipilih
  const selectedChild = useMemo(() => {
    return activeChildrenList.find((c) => c.id === activeChildId);
  }, [activeChildrenList, activeChildId]);

  // Hitung status defisit dan usia anak terpilih
  const deficitCondition: DeficitCondition | undefined = useMemo(() => {
    if (!selectedChild) return undefined;

    const measurements = selectedChild.measurements || [];
    let is_stunted = false;
    let is_underweight = false;
    let is_wasted = false;
    let age_months: number | undefined = undefined;

    if (measurements.length > 0) {
      // Ambil pengukuran terakhir berdasarkan tanggal
      const sorted = [...measurements].sort(
        (a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime(),
      );
      const latest = sorted[0];
      is_stunted = (latest.zscore_hfa ?? 0) < -2;
      is_underweight = (latest.zscore_wfa ?? 0) < -2;
      is_wasted = (latest.zscore_wfh ?? 0) < -2;
      age_months = latest.age_months;
    } else {
      // Hitung perkiraan umur bulan dari birth_date
      const birth = new Date(selectedChild.birth_date);
      const now = new Date();
      const diffMonths =
        (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
      age_months = Math.max(0, Math.min(60, diffMonths));
    }

    return {
      child_name: selectedChild.name,
      is_stunted,
      is_underweight,
      is_wasted,
      age_months,
    };
  }, [selectedChild]);

  // Urutkan & personaliasikan resep menggunakan smart engine (offline & client-side ready)
  const prioritizedRecipes = useMemo(() => {
    const scored = generateSmartRecipes(deficitCondition, recipesList);

    return scored.filter((recipe) => {
      const matchSearch =
        searchQuery === "" ||
        recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.ingredients.some((ing) =>
          ing.name.toLowerCase().includes(searchQuery.toLowerCase()),
        );

      const matchCategory =
        categoryFilter === "all" || recipe.category.includes(categoryFilter);

      return matchSearch && matchCategory;
    });
  }, [deficitCondition, recipesList, searchQuery, categoryFilter]);

  const handleChildSelect = (childId: string) => {
    setActiveChildId(childId);
    try {
      const url = childId ? `/recipes?child_id=${childId}` : "/recipes";
      window.history.replaceState(null, "", url);
    } catch {
      // ignore
    }
  };

  const handleOpenEdit = (recipe: SmartRecipe) => {
    setActionFeedback(null);
    setEditingRecipe(recipe);
  };

  const handleOpenDelete = (recipe: SmartRecipe) => {
    setActionFeedback(null);
    setDeleteError(null);
    setDeletingRecipe(recipe);
  };

  const handleDeleteRecipe = async () => {
    if (!deletingRecipe) return;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      const res = await deleteRecipe(deletingRecipe.id);
      if (res.success) {
        setRecipesList((prev) => prev.filter((r) => r.id !== deletingRecipe.id));
        setActionFeedback({
          type: "success",
          message: res.message || `Resep "${deletingRecipe.title}" berhasil dihapus.`,
        });
        setDeletingRecipe(null);
        router.refresh();
      } else {
        setDeleteError(res.error || "Gagal menghapus resep");
      }
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Terjadi kesalahan internal");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRecipeSuccess = (message?: string) => {
    setActionFeedback({
      type: "success",
      message: message || "Operasi resep berhasil disimpan!",
    });
    setEditingRecipe(null);
    setIsAddModalOpen(false);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Bar Pemilihan Anak & Tombol Tambah Resep untuk Ahli Gizi */}
      <div className="p-4 rounded-xl border bg-card shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs font-semibold text-foreground">
              Pilih Balita untuk Rekomendasi Menu Presisi Defisit Gizi:
            </span>
          </div>

          {isNutritionistOrAdmin && (
            <Button
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1.5 shadow-sm shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Resep Baru
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-6">
            <select
              value={activeChildId}
              onChange={(e) => handleChildSelect(e.target.value)}
              className="w-full text-xs h-9 px-3 rounded-md border border-input bg-background font-medium focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">-- Tampilkan Semua Resep (Tanpa Filter Balita) --</option>
              {activeChildrenList.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name} ({child.gender === "male" ? "Laki-laki" : "Perempuan"}
                  {child.region ? ` - ${child.region}` : ""})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-4 relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari menu atau bahan (cth: lele, kelor)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs h-9 pl-8 pr-3 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="sm:col-span-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full text-xs h-9 px-2 rounded-md border border-input bg-background text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">Semua Kategori</option>
              <option value="Stunting">Stunting</option>
              <option value="Wasting">Wasting</option>
              <option value="Underweight">Underweight</option>
              <option value="Gizi Seimbang">Gizi Seimbang</option>
            </select>
          </div>
        </div>
      </div>

      {/* Banner Rekomendasi Terpersonalisasi Balita Terpilih */}
      {deficitCondition && selectedChild && (
        <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-2.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-semibold text-xs sm:text-sm text-foreground">
                Rekomendasi Menu Khusus untuk {deficitCondition.child_name}{" "}
                {typeof deficitCondition.age_months === "number" && (
                  <span className="font-normal text-muted-foreground">
                    (Usia {deficitCondition.age_months} Bulan)
                  </span>
                )}
              </span>
            </div>
            <Link href={`/z-score?child_id=${activeChildId}`}>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                Periksa Grafik Pertumbuhan
              </Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground">
            Berdasarkan pemeriksaan antropometri terakhir, menu diurutkan untuk memprioritaskan pemulihan defisiensi zat gizi makro & mikro balita:
          </p>

          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            {deficitCondition.is_stunted && (
              <Badge className="bg-red-600 text-white text-[10px] gap-1">
                <CheckCircle className="w-3 h-3" /> Prioritas: Protein Hewani, Zat Besi & Zink (Stunting TB/U)
              </Badge>
            )}
            {deficitCondition.is_wasted && (
              <Badge className="bg-amber-600 text-white text-[10px] gap-1">
                <CheckCircle className="w-3 h-3" /> Prioritas: Makanan Padat Kalori & Lemak Sehat (Wasting BB/TB)
              </Badge>
            )}
            {deficitCondition.is_underweight && (
              <Badge className="bg-yellow-600 text-white text-[10px] gap-1">
                <CheckCircle className="w-3 h-3" /> Prioritas: Kalori & Protein Bertahap (Underweight BB/U)
              </Badge>
            )}
            {!deficitCondition.is_stunted &&
              !deficitCondition.is_wasted &&
              !deficitCondition.is_underweight && (
                <Badge className="bg-emerald-600 text-white text-[10px]">
                  Pertahankan Gizi Seimbang & Ragam Pangan Sehat
                </Badge>
              )}
          </div>
        </div>
      )}

      {/* Banner Feedback Aksi Resep */}
      {actionFeedback && (
        <div
          className={`p-3 rounded-lg text-xs flex items-start justify-between border ${
            actionFeedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}
        >
          <div className="flex items-start gap-2">
            {actionFeedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-semibold block">
                {actionFeedback.type === "success" ? "Berhasil:" : "Gagal:"}
              </span>
              <span className="font-mono text-[11px] break-all">{actionFeedback.message}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Grid Kartu Resep Gizi Cerdas */}
      {prioritizedRecipes.length === 0 ? (
        <div className="p-12 text-center border rounded-xl bg-card space-y-3">
          <UtensilsCrossed className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
          <p className="text-xs text-muted-foreground">
            Tidak ada resep yang sesuai dengan kriteria pencarian atau filter.
          </p>
          {isNutritionistOrAdmin && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1.5"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Resep Sekarang
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {prioritizedRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              currentUserId={currentUserId}
              userRole={userRole}
              onEdit={handleOpenEdit}
              onDelete={handleOpenDelete}
            />
          ))}
        </div>
      )}

      {/* Modal Tambah Resep Baru (Khusus Nutritionist & Admin) */}
      {isNutritionistOrAdmin && (
        <AddRecipeModal
          commodities={activeCommodities}
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleRecipeSuccess}
        />
      )}

      {/* Modal Edit Resep (Khusus Pembuat Resep atau Admin) */}
      {editingRecipe && (
        <AddRecipeModal
          commodities={activeCommodities}
          isOpen={Boolean(editingRecipe)}
          initialRecipe={editingRecipe}
          onClose={() => setEditingRecipe(null)}
          onSuccess={handleRecipeSuccess}
        />
      )}

      {/* Modal Konfirmasi Hapus Resep */}
      {deletingRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-card border border-destructive/30 rounded-xl shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center gap-2 text-destructive border-b pb-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-sm">Konfirmasi Hapus Resep</h3>
            </div>

            {/* Error banner dialog delete resep */}
            {deleteError && (
              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold block">Gagal Menghapus:</span>
                  <span className="font-mono text-[11px] break-all">{deleteError}</span>
                </div>
              </div>
            )}

            <p className="text-muted-foreground leading-relaxed">
              Apakah Anda yakin ingin menghapus resep{" "}
              <strong className="text-foreground">{deletingRecipe.title}</strong>? Resep dan seluruh
              komposisi bahannya akan dihapus secara permanen dari database.
            </p>

            <div className="text-[11px] font-mono text-muted-foreground bg-muted/40 p-2 rounded border">
              ID: {deletingRecipe.id}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setDeletingRecipe(null)}
                disabled={isDeleting}
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="h-8 text-xs gap-1.5"
                onClick={handleDeleteRecipe}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus Resep
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
