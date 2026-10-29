"use server";

import { createClient } from "@/lib/supabase/server";
import { recipeSchema, RecipeFormData } from "@/lib/validators";
import {
  SmartRecipe,
  RecipeIngredient,
  CommodityNutrition,
  calculateNutrientsFromIngredients,
  getAkgReferenceForAge,
  calculateAkgPercentages,
  RECIPE_TEMPLATES,
} from "@/lib/recipe-engine";
import { revalidatePath } from "next/cache";

export interface CommodityWithNutrition {
  id: string;
  name: string;
  category: string;
  unit: string;
  gram_per_unit: number;
  latest_price?: number; // Harga per unit (Rp) dari tabel daily_prices
  nutrition?: {
    calories: number;
    protein: number;
    iron: number;
    zinc: number;
    calcium: number;
    fat?: number;
  };
}

/**
 * Mengambil daftar komoditas pangan beserta informasi nutrisinya (per 100 gram) dan harga pasar harian terkini
 */
export async function getCommoditiesWithNutrition(): Promise<{
  data: CommodityWithNutrition[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const [commsRes, nutRes, priceRes] = await Promise.all([
      supabase.from("commodities").select("*").order("name", { ascending: true }),
      supabase.from("commodity_nutrition").select("*"),
      supabase
        .from("daily_prices")
        .select("commodity_id, price, recorded_at")
        .order("recorded_at", { ascending: false }),
    ]);

    if (commsRes.error) {
      return { data: [], error: commsRes.error.message };
    }

    const nutMap = new Map<string, CommodityNutrition>();
    if (nutRes.data) {
      for (const row of nutRes.data) {
        nutMap.set(row.commodity_id, row);
      }
    }

    // Ambil harga terbaru per komoditas
    const priceMap = new Map<string, number>();
    if (priceRes.data) {
      for (const p of priceRes.data) {
        if (!priceMap.has(p.commodity_id) && p.price !== null) {
          priceMap.set(p.commodity_id, Number(p.price));
        }
      }
    }

    const commodities: CommodityWithNutrition[] = (commsRes.data || []).map((com) => {
      const nut = nutMap.get(com.id);
      return {
        id: com.id,
        name: com.name,
        category: com.category,
        unit: com.unit,
        gram_per_unit: Number(com.gram_per_unit) || 100,
        latest_price: priceMap.get(com.id),
        nutrition: nut
          ? {
              calories: Number(nut.calories) || 0,
              protein: Number(nut.protein) || 0,
              iron: Number(nut.iron) || 0,
              zinc: Number(nut.zinc) || 0,
              calcium: Number(nut.calcium) || 0,
              fat: Number(nut.fat) || 0,
            }
          : undefined,
      };
    });

    return { data: commodities };
  } catch (err: unknown) {
    return {
      data: [],
      error: err instanceof Error ? err.message : "Gagal memuat data komoditas",
    };
  }
}

interface DbIngredientRow {
  id?: string;
  ingredient_type?: string;
  commodity_id?: string;
  ingredient_name?: string;
  amount_description?: string;
  quantity?: number | string | null;
  unit_label?: string | null;
  weight_grams?: number | string | null;
  estimated_cost?: number | string | null;
  is_local_hero?: boolean;
  display_order?: number | null;
}

interface DbRecipeRow {
  id: string;
  title: string;
  category: "Stunting (TB/U)" | "Wasting (BB/TB)" | "Underweight (BB/U)" | "Gizi Seimbang";
  target_age_min_months?: number;
  target_age_max_months?: number;
  preparation_time_minutes?: number;
  servings?: number;
  cost_per_serving?: number;
  highlights?: string[];
  instructions?: string[];
  created_by?: string;
  creator_name?: string;
  recipe_ingredients?: DbIngredientRow[];
}

/**
 * Mengambil semua resep dari database (disatukan dengan template bawaan jika belum ada di database)
 */
export async function getRecipes(): Promise<{
  data: SmartRecipe[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Cek apakah tabel recipes sudah tersedia di schema
    const { data: dbRecipes, error: recipeError } = await supabase
      .from("recipes")
      .select(`
        id,
        title,
        category,
        target_age_min_months,
        target_age_max_months,
        preparation_time_minutes,
        servings,
        cost_per_serving,
        highlights,
        instructions,
        created_by,
        created_at,
        recipe_ingredients (
          id,
          ingredient_type,
          commodity_id,
          quantity,
          unit_label,
          weight_grams,
          ingredient_name,
          amount_description,
          estimated_cost,
          display_order
        )
      `)
      .order("created_at", { ascending: false });

    if (recipeError) {
      console.warn("Tabel recipes belum siap atau error:", recipeError.message);
      // Fallback ke template
      return { data: RECIPE_TEMPLATES };
    }

    if (!dbRecipes || dbRecipes.length === 0) {
      return { data: RECIPE_TEMPLATES };
    }

    // Ambil semua nutrisi komoditas untuk kalkulasi real
    const { data: nutList } = await supabase.from("commodity_nutrition").select("*");
    const { data: commList } = await supabase.from("commodities").select("id, name");

    const commNameMap = new Map<string, string>();
    (commList || []).forEach((c) => commNameMap.set(c.id, c.name));

    const nutMap = new Map<string, CommodityNutrition>();
    (nutList || []).forEach((n) =>
      nutMap.set(n.commodity_id, {
        commodity_id: n.commodity_id,
        calories: Number(n.calories) || 0,
        protein: Number(n.protein) || 0,
        iron: Number(n.iron) || 0,
        zinc: Number(n.zinc) || 0,
        calcium: Number(n.calcium) || 0,
        fat: Number(n.fat) || 0,
      }),
    );

    const mappedDbRecipes: SmartRecipe[] = (dbRecipes as unknown as DbRecipeRow[]).map(
      (r: DbRecipeRow) => {
        const rawIngredients = r.recipe_ingredients || [];

        // Sort display order
        rawIngredients.sort(
          (a: DbIngredientRow, b: DbIngredientRow) =>
            (a.display_order ?? 0) - (b.display_order ?? 0),
        );

        const calculatedItems = rawIngredients.filter(
          (i: DbIngredientRow) => i.ingredient_type === "calculated" && i.commodity_id,
        );

        // Hitung nutrisi otomatis dari commodity_nutrition
        const nutrients = calculateNutrientsFromIngredients(
          calculatedItems.map((i: DbIngredientRow) => ({
            commodity_id: i.commodity_id as string,
            weight_grams: Number(i.weight_grams) || 0,
          })),
          nutMap,
          r.servings || 1,
        );

        // Hitung AKG berdasarkan umur tengah resep
        const midAge = Math.round(
          ((r.target_age_min_months ?? 12) + (r.target_age_max_months ?? 59)) / 2,
        );
        const akg = getAkgReferenceForAge(midAge);
        const akgPercentage = calculateAkgPercentages(nutrients, akg);

        const ingredients: RecipeIngredient[] = rawIngredients.map((i: DbIngredientRow) => {
        const isCalc = i.ingredient_type === "calculated";
        const commName = i.commodity_id ? commNameMap.get(i.commodity_id) : "";
        const name = isCalc ? commName || i.ingredient_name || "Bahan Gizi" : i.ingredient_name || "";
        
        let amount = "";
        if (isCalc) {
          const qty = i.quantity ? Number(i.quantity) : null;
          const unit = i.unit_label || "";
          const grams = Number(i.weight_grams) || 0;
          if (qty && unit && unit !== "gram") {
            amount = `${qty} ${unit} (${grams}g)`;
          } else {
            amount = `${grams} gram`;
          }
        } else {
          amount = i.amount_description || `${i.quantity || ""} ${i.unit_label || ""}`.trim();
        }

        return {
          id: i.id,
          ingredientType: isCalc ? "calculated" : "additional",
          name,
          amount,
          estimatedCost: Number(i.estimated_cost) || 0,
          commodityId: i.commodity_id,
          weightGrams: Number(i.weight_grams) || 0,
        };
      });

      return {
        id: r.id,
        title: r.title,
        category: r.category,
        targetAge: `${r.target_age_min_months} - ${r.target_age_max_months} Bulan`,
        targetAgeMinMonths: r.target_age_min_months,
        targetAgeMaxMonths: r.target_age_max_months,
        costPerServing: Number(r.cost_per_serving) || 0,
        preparationTime: `${r.preparation_time_minutes} Menit`,
        preparationTimeMinutes: r.preparation_time_minutes,
        servings: r.servings || 1,
        nutrients,
        akgPercentage,
        highlights: Array.isArray(r.highlights) ? r.highlights : [],
        ingredients,
        instructions: Array.isArray(r.instructions) ? r.instructions : [],
        createdBy: r.created_by,
        source: "database",
      };
    });

    // Gabungkan resep DB dengan template
    return { data: [...mappedDbRecipes, ...RECIPE_TEMPLATES] };
  } catch (err: unknown) {
    console.error("Gagal getRecipes:", err);
    return { data: RECIPE_TEMPLATES };
  }
}

/**
 * Server Action: Menyimpan resep baru yang dimasukkan oleh Nutritionist / Admin
 */
export async function createRecipe(formData: RecipeFormData): Promise<{
  success: boolean;
  recipeId?: string;
  message?: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: "Sesi login tidak valid. Silakan masuk terlebih dahulu.",
      };
    }

    // Role check: hanya nutritionist dan admin yang boleh menambahkan resep
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role || (user.user_metadata?.role as string);
    if (!["nutritionist", "admin"].includes(role)) {
      return {
        success: false,
        error: "Akses ditolak: Hanya Ahli Gizi (Nutritionist) atau Administrator yang berhak menambah resep.",
      };
    }

    const validated = recipeSchema.parse(formData);

    // Hitung total estimasi biaya per porsi jika belum diatur secara eksplisit
    let totalCost = 0;
    validated.calculated_ingredients.forEach((ing) => (totalCost += ing.estimated_cost || 0));
    validated.additional_ingredients.forEach((ing) => (totalCost += ing.estimated_cost || 0));
    const costPerServing =
      validated.cost_per_serving > 0
        ? validated.cost_per_serving
        : Math.round(totalCost / validated.servings);

    // 1. Simpan header resep
    const { data: insertedRecipe, error: insertError } = await supabase
      .from("recipes")
      .insert({
        title: validated.title,
        category: validated.category,
        target_age_min_months: validated.target_age_min_months,
        target_age_max_months: validated.target_age_max_months,
        preparation_time_minutes: validated.preparation_time_minutes,
        servings: validated.servings,
        cost_per_serving: costPerServing,
        highlights: validated.highlights.filter(Boolean),
        instructions: validated.instructions.filter(Boolean),
        created_by: user.id,
      })
      .select("id")
      .single();

    if (insertError || !insertedRecipe) {
      return {
        success: false,
        error: insertError?.message || "Gagal menyimpan resep ke basis data",
      };
    }

    const recipeId = insertedRecipe.id;

    // 2. Simpan daftar bahan resep (calculated & additional)
    const ingredientsPayload: Array<Record<string, unknown>> = [];
    let order = 1;

    for (const calc of validated.calculated_ingredients) {
      ingredientsPayload.push({
        recipe_id: recipeId,
        ingredient_type: "calculated",
        commodity_id: calc.commodity_id,
        quantity: calc.quantity,
        unit_label: calc.unit_label || "unit",
        weight_grams: calc.weight_grams,
        estimated_cost: calc.estimated_cost || 0,
        display_order: order++,
      });
    }

    for (const add of validated.additional_ingredients) {
      ingredientsPayload.push({
        recipe_id: recipeId,
        ingredient_type: "additional",
        ingredient_name: add.ingredient_name,
        amount_description: add.amount_description,
        estimated_cost: add.estimated_cost || 0,
        display_order: order++,
      });
    }

    if (ingredientsPayload.length > 0) {
      const { error: ingError } = await supabase
        .from("recipe_ingredients")
        .insert(ingredientsPayload);

      if (ingError) {
        console.error("Gagal menyimpan bahan resep:", ingError);
        return {
          success: true,
          recipeId,
          error: "Resep tersimpan, namun beberapa bahan gagal tercatat: " + ingError.message,
        };
      }
    }

    revalidatePath("/recipes");
    return {
      success: true,
      recipeId,
      message: `Resep "${validated.title}" berhasil dibuat dan disimpan ke katalog menu.`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Terjadi kesalahan internal saat membuat resep",
    };
  }
}

/**
 * Server Action: Memperbarui resep yang dibuat oleh Nutritionist atau Admin
 */
export async function updateRecipe(
  recipeId: string,
  formData: RecipeFormData,
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: "Sesi login tidak valid. Silakan masuk terlebih dahulu.",
      };
    }

    // Role check: hanya nutritionist dan admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return {
        success: false,
        error: `[RLS / Auth Error] Verifikasi profil gagal: ${profileError.message}`,
      };
    }

    const role = profile?.role || (user.user_metadata?.role as string);
    if (!["nutritionist", "admin"].includes(role)) {
      return {
        success: false,
        error: "Akses ditolak: Hanya Ahli Gizi (Nutritionist) atau Administrator yang berhak mengubah resep.",
      };
    }

    // Periksa pemilik resep (kecuali admin yang memiliki hak superuser)
    const { data: existingRecipe, error: fetchRecipeError } = await supabase
      .from("recipes")
      .select("id, created_by")
      .eq("id", recipeId)
      .maybeSingle();

    if (fetchRecipeError) {
      return {
        success: false,
        error: `[RLS / Database Error] Gagal memverifikasi resep: ${fetchRecipeError.message} (Code: ${fetchRecipeError.code || "unknown"})`,
      };
    }

    if (!existingRecipe) {
      return {
        success: false,
        error: "Resep tidak ditemukan di database atau merupakan resep bawaan sistem.",
      };
    }

    if (role !== "admin" && existingRecipe.created_by !== user.id) {
      return {
        success: false,
        error: "Akses ditolak: Anda hanya dapat mengubah resep yang Anda buat sendiri.",
      };
    }

    const validated = recipeSchema.parse(formData);

    // Hitung estimasi biaya
    let totalCost = 0;
    validated.calculated_ingredients.forEach((ing) => (totalCost += ing.estimated_cost || 0));
    validated.additional_ingredients.forEach((ing) => (totalCost += ing.estimated_cost || 0));
    const costPerServing =
      validated.cost_per_serving > 0
        ? validated.cost_per_serving
        : Math.round(totalCost / validated.servings);

    // 1. Update tabel recipes
    const { error: updateError } = await supabase
      .from("recipes")
      .update({
        title: validated.title,
        category: validated.category,
        target_age_min_months: validated.target_age_min_months,
        target_age_max_months: validated.target_age_max_months,
        preparation_time_minutes: validated.preparation_time_minutes,
        servings: validated.servings,
        cost_per_serving: costPerServing,
        highlights: validated.highlights.filter(Boolean),
        instructions: validated.instructions.filter(Boolean),
      })
      .eq("id", recipeId);

    if (updateError) {
      return {
        success: false,
        error: `[Database/RLS Error] Gagal memperbarui header resep: ${updateError.message} (Code: ${updateError.code || "unknown"})`,
      };
    }

    // 2. Refresh bahan-bahan: Hapus bahan lama dan insert yang baru
    const { error: delIngError } = await supabase
      .from("recipe_ingredients")
      .delete()
      .eq("recipe_id", recipeId);

    if (delIngError) {
      console.warn("Gagal membersihkan bahan lama resep:", delIngError.message);
    }

    const ingredientsPayload: Array<Record<string, unknown>> = [];
    let order = 1;

    for (const calc of validated.calculated_ingredients) {
      ingredientsPayload.push({
        recipe_id: recipeId,
        ingredient_type: "calculated",
        commodity_id: calc.commodity_id,
        quantity: calc.quantity,
        unit_label: calc.unit_label || "unit",
        weight_grams: calc.weight_grams,
        estimated_cost: calc.estimated_cost || 0,
        display_order: order++,
      });
    }

    for (const add of validated.additional_ingredients) {
      ingredientsPayload.push({
        recipe_id: recipeId,
        ingredient_type: "additional",
        ingredient_name: add.ingredient_name,
        amount_description: add.amount_description,
        estimated_cost: add.estimated_cost || 0,
        display_order: order++,
      });
    }

    if (ingredientsPayload.length > 0) {
      const { error: insIngError } = await supabase
        .from("recipe_ingredients")
        .insert(ingredientsPayload);

      if (insIngError) {
        return {
          success: true,
          message: `Resep "${validated.title}" diperbarui, namun beberapa bahan mengalami kendala: ${insIngError.message}`,
        };
      }
    }

    revalidatePath("/recipes");
    return {
      success: true,
      message: `Resep "${validated.title}" berhasil diperbarui.`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error
          ? `[System Error] ${err.message}`
          : "Terjadi kesalahan internal saat memperbarui resep",
    };
  }
}

/**
 * Server Action: Menghapus resep yang dibuat oleh Nutritionist atau Admin
 */
export async function deleteRecipe(recipeId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: "Sesi login tidak valid. Silakan masuk terlebih dahulu.",
      };
    }

    // Role check
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return {
        success: false,
        error: `[RLS / Auth Error] Verifikasi profil gagal: ${profileError.message}`,
      };
    }

    const role = profile?.role || (user.user_metadata?.role as string);
    if (!["nutritionist", "admin"].includes(role)) {
      return {
        success: false,
        error: "Akses ditolak: Hanya Ahli Gizi (Nutritionist) atau Administrator yang berhak menghapus resep.",
      };
    }

    // Periksa kepemilikan resep
    const { data: existingRecipe, error: fetchRecipeError } = await supabase
      .from("recipes")
      .select("id, title, created_by")
      .eq("id", recipeId)
      .maybeSingle();

    if (fetchRecipeError) {
      return {
        success: false,
        error: `[RLS / Database Error] Gagal memverifikasi resep: ${fetchRecipeError.message} (Code: ${fetchRecipeError.code || "unknown"})`,
      };
    }

    if (!existingRecipe) {
      return {
        success: false,
        error: "Resep tidak ditemukan di database (resep bawaan sistem tidak dapat dihapus).",
      };
    }

    if (role !== "admin" && existingRecipe.created_by !== user.id) {
      return {
        success: false,
        error: "Akses ditolak: Anda hanya dapat menghapus resep yang Anda buat sendiri.",
      };
    }

    // 1. Hapus bahan resep terkait
    const { error: delIngError } = await supabase
      .from("recipe_ingredients")
      .delete()
      .eq("recipe_id", recipeId);

    if (delIngError) {
      console.warn("Gagal menghapus recipe_ingredients (lanjut ke recipes):", delIngError.message);
    }

    // 2. Hapus resep
    const { error: delRecipeError } = await supabase
      .from("recipes")
      .delete()
      .eq("id", recipeId);

    if (delRecipeError) {
      return {
        success: false,
        error: `[Database/RLS Error] Gagal menghapus resep: ${delRecipeError.message} (Code: ${delRecipeError.code || "unknown"})`,
      };
    }

    revalidatePath("/recipes");
    return {
      success: true,
      message: `Resep "${existingRecipe.title}" berhasil dihapus dari sistem.`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error
          ? `[System Error] ${err.message}`
          : "Terjadi kesalahan internal saat menghapus resep",
    };
  }
}
