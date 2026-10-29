"use client";

import { useState } from "react";
import { SmartRecipe } from "@/lib/recipe-engine";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  ChefHat,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Printer,
  Pencil,
  Trash2,
  UserCheck,
} from "lucide-react";

interface RecipeCardProps {
  recipe: SmartRecipe;
  currentUserId?: string;
  userRole?: string | null;
  onEdit?: (recipe: SmartRecipe) => void;
  onDelete?: (recipe: SmartRecipe) => void;
}

export function RecipeCard({
  recipe,
  currentUserId,
  userRole,
  onEdit,
  onDelete,
}: RecipeCardProps) {
  const [showInstructions, setShowInstructions] = useState(false);

  const isAuthor = Boolean(
    recipe.source === "database" &&
      currentUserId &&
      recipe.createdBy &&
      recipe.createdBy === currentUserId,
  );

  const canManageThisRecipe =
    recipe.source === "database" && (isAuthor || userRole === "admin");

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <Card className="border shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between">
      <div>
        <CardHeader className="pb-3 border-b bg-card">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                <Badge
                  variant="outline"
                  className="text-[11px] font-medium bg-primary/10 text-primary border-primary/20"
                >
                  {recipe.category}
                </Badge>
                {isAuthor && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] py-0 px-1.5 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 gap-1 font-semibold"
                  >
                    <UserCheck className="w-3 h-3 text-emerald-600" />
                    Resep Buatan Anda
                  </Badge>
                )}
                {recipe.source === "database" && !isAuthor && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-muted-foreground">
                    Resep Pengguna
                  </Badge>
                )}
                {recipe.source !== "database" && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-muted-foreground border-dashed">
                    Standar Kemenkes
                  </Badge>
                )}
              </div>
              <CardTitle className="text-base font-bold text-foreground leading-snug">
                {recipe.title}
              </CardTitle>
              <CardDescription className="text-xs flex items-center gap-3 mt-1.5 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {recipe.preparationTime}
                </span>
                <span>•</span>
                <span>Usia {recipe.targetAge}</span>
              </CardDescription>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] text-muted-foreground block">Estimasi Biaya</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {formatRupiah(recipe.costPerServing)}
              </span>
              <span className="text-[10px] text-muted-foreground block">/ porsi</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4 text-xs">
          {/* Nilai Gizi & Pemenuhan AKG Harian */}
          <div className="space-y-2 p-3 rounded-lg bg-muted/40 border">
            <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Kandungan Nutrisi & % AKG Balita per Porsi
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1">
              <div className="p-2 rounded bg-background border">
                <span className="text-[10px] text-muted-foreground block">Protein</span>
                <span className="font-bold text-foreground text-xs">{recipe.nutrients.protein}g</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-medium">
                  {recipe.akgPercentage.protein}% AKG
                </span>
              </div>
              <div className="p-2 rounded bg-background border">
                <span className="text-[10px] text-muted-foreground block">Zat Besi</span>
                <span className="font-bold text-foreground text-xs">{recipe.nutrients.iron}mg</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-medium">
                  {recipe.akgPercentage.iron}% AKG
                </span>
              </div>
              <div className="p-2 rounded bg-background border">
                <span className="text-[10px] text-muted-foreground block">Zink</span>
                <span className="font-bold text-foreground text-xs">{recipe.nutrients.zinc}mg</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-medium">
                  {recipe.akgPercentage.zinc}% AKG
                </span>
              </div>
              <div className="p-2 rounded bg-background border">
                <span className="text-[10px] text-muted-foreground block">Kalsium</span>
                <span className="font-bold text-foreground text-xs">{recipe.nutrients.calcium}mg</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-medium">
                  {recipe.akgPercentage.calcium}% AKG
                </span>
              </div>
            </div>
          </div>

          {/* Bahan Pangan Terhitung (Nutrisi) & Bahan Tambahan/Bumbu */}
          <div className="space-y-3">
            {/* Bahan Terhitung */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                <span>Bahan Pangan Utama (Terhitung Nutrisi):</span>
                <span className="text-[10px] text-muted-foreground font-normal">Sesuai Tabel Gizi</span>
              </span>
              <ul className="space-y-1 text-[11px]">
                {recipe.ingredients
                  .filter((ing) => ing.ingredientType === "calculated" || !ing.ingredientType)
                  .map((ing, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between p-1.5 rounded bg-muted/30 hover:bg-muted/60 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="text-foreground font-medium">{ing.name}</span>
                        <span className="text-muted-foreground text-[10px]">({ing.amount})</span>
                        {ing.isLocalHero && (
                          <Badge variant="secondary" className="text-[9px] py-0 px-1 bg-amber-500/15 text-amber-700 dark:text-amber-300">
                            Pangan Lokal
                          </Badge>
                        )}
                      </div>
                      <span className="text-muted-foreground font-mono text-[10px] shrink-0">
                        {formatRupiah(ing.estimatedCost)}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>

            {/* Bahan Tambahan (Dikecualikan dari Kalkulasi Nutrisi) */}
            {recipe.ingredients.some((ing) => ing.ingredientType === "additional") && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-muted-foreground">
                    Bahan Tambahan / Bumbu:
                  </span>
                  <Badge variant="outline" className="text-[9px] py-0 px-1 text-muted-foreground border-dashed">
                    Tidak Dihitung Gizi
                  </Badge>
                </div>
                <ul className="space-y-1 text-[11px]">
                  {recipe.ingredients
                    .filter((ing) => ing.ingredientType === "additional")
                    .map((ing, idx) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between p-1.5 rounded border border-dashed border-muted-foreground/20 text-muted-foreground hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
                          <span>
                            {ing.name} <span className="text-[10px]">({ing.amount})</span>
                          </span>
                        </div>
                        {ing.estimatedCost > 0 && (
                          <span className="font-mono text-[10px] shrink-0">
                            {formatRupiah(ing.estimatedCost)}
                          </span>
                        )}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>


          {/* Langkah Memasak Praktis (Accordion Toggle) */}
          {showInstructions && (
            <div className="space-y-2 pt-2 border-t">
              <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                <ChefHat className="w-3.5 h-3.5 text-primary" />
                Langkah Pengolahan Praktis (Higienis):
              </span>
              <ol className="space-y-1.5 text-[11px] text-muted-foreground list-decimal list-inside pl-1">
                {recipe.instructions.map((step, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </CardContent>
      </div>

      <div className="p-3 bg-muted/20 border-t flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
            onClick={() => setShowInstructions(!showInstructions)}
          >
            {showInstructions ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                Tutup Langkah
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                Lihat Cara Masak
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => window.print()}
            title="Cetak Resep ini untuk Orang Tua Balita"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak
          </Button>
        </div>

        {/* Tombol Manajemen: Edit & Hapus (Khusus Pembuat atau Admin) */}
        {canManageThisRecipe && (
          <div className="flex items-center gap-1">
            {onEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onEdit(recipe)}
                className="h-8 text-xs px-2.5 gap-1 border-muted-foreground/30 hover:bg-primary/10 hover:text-primary"
                title="Edit resep ini"
              >
                <Pencil className="w-3 h-3" />
                <span>Edit</span>
              </Button>
            )}
            {onDelete && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onDelete(recipe)}
                className="h-8 text-xs px-2.5 gap-1 text-destructive hover:bg-destructive/10 border-destructive/30"
                title="Hapus resep ini"
              >
                <Trash2 className="w-3 h-3" />
                <span>Hapus</span>
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
