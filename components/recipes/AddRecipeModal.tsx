"use client";

import { useState, useMemo, useEffect } from "react";
import { CommodityWithNutrition, createRecipe, updateRecipe } from "@/actions/recipes";
import {
  calculateNutrientsFromIngredients,
  calculateAkgPercentages,
  getAkgReferenceForAge,
  CommodityNutrition,
  SmartRecipe,
} from "@/lib/recipe-engine";
import { RecipeFormData } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Sparkles,
  Info,
  Scale,
  ChefHat,
  AlertCircle,
  CheckCircle2,
  X,
  Coins,
} from "lucide-react";

interface AddRecipeModalProps {
  commodities: CommodityWithNutrition[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message?: string) => void;
  initialRecipe?: SmartRecipe | null;
}

interface CalculatedItem {
  commodity_id: string;
  quantity: number | "";
  unit_label: string;
  weight_grams: number | "";
  estimated_cost: number | "";
  cost_manual_override?: boolean;
}

interface AdditionalItem {
  ingredient_name: string;
  amount_description: string;
  estimated_cost: number | "";
}

/**
 * Helper to safely handle numeric input changes without leading zeros or getting stuck at 0
 */
function parseNumericInput(val: string, allowDecimal = false): number | "" {
  const cleaned = val.trim();
  if (cleaned === "") return "";
  
  // If the user inputs a digit when existing value was "0" (e.g. "05" or "02"), strip leading zero
  const normalized = cleaned.replace(/^0+(?=\d)/, "");
  const parsed = allowDecimal ? parseFloat(normalized) : parseInt(normalized, 10);
  return isNaN(parsed) ? "" : parsed;
}

export function AddRecipeModal({
  commodities,
  isOpen,
  onClose,
  onSuccess,
  initialRecipe,
}: AddRecipeModalProps) {
  const isEditing = Boolean(initialRecipe && initialRecipe.source === "database");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<
    "Stunting (TB/U)" | "Wasting (BB/TB)" | "Underweight (BB/U)" | "Gizi Seimbang"
  >("Stunting (TB/U)");
  const [targetAgeMin, setTargetAgeMin] = useState<number | "">(12);
  const [targetAgeMax, setTargetAgeMax] = useState<number | "">(59);
  const [prepTimeMinutes, setPrepTimeMinutes] = useState<number | "">(30);
  const [servings, setServings] = useState<number | "">(1);
  const [costPerServing, setCostPerServing] = useState<number | "">("");

  // Default initial calculated ingredient
  const initialCommodity = commodities[0];
  const initialQty = 1;
  const initialGramPerUnit = initialCommodity?.gram_per_unit || 100;
  const initialWeight = initialQty * initialGramPerUnit;
  const initialCost = initialCommodity?.latest_price
    ? Math.round(initialCommodity.latest_price * initialQty)
    : 1000;

  // Bahan Terhitung Nutrisi
  const [calculatedIngredients, setCalculatedIngredients] = useState<CalculatedItem[]>([
    {
      commodity_id: initialCommodity?.id || "",
      quantity: initialQty,
      unit_label: initialCommodity?.unit || "unit",
      weight_grams: initialWeight,
      estimated_cost: initialCost,
      cost_manual_override: false,
    },
  ]);

  // Bahan Tambahan (Dikecualikan)
  const [additionalIngredients, setAdditionalIngredients] = useState<AdditionalItem[]>([]);

  // Highlights / Nilai Unggul
  const [highlights, setHighlights] = useState<string[]>([
    "Tinggi zat gizi esensial dari bahan pangan lokal terjangkau",
  ]);

  // Langkah Memasak
  const [instructions, setInstructions] = useState<string[]>([
    "Persiapkan bahan dan cuci bersih dengan air mengalir.",
    "Kukus atau rebus hingga matang merata dan sajikan selagi hangat.",
  ]);

  // Populate data jika dalam mode edit
  useEffect(() => {
    if (initialRecipe) {
      setTitle(initialRecipe.title);
      setCategory(initialRecipe.category);
      setTargetAgeMin(initialRecipe.targetAgeMinMonths ?? 12);
      setTargetAgeMax(initialRecipe.targetAgeMaxMonths ?? 59);
      setPrepTimeMinutes(initialRecipe.preparationTimeMinutes ?? 30);
      setServings(initialRecipe.servings || 1);
      setCostPerServing(initialRecipe.costPerServing || "");

      // Ingredients
      const calcItems: CalculatedItem[] = [];
      const addItems: AdditionalItem[] = [];

      for (const ing of initialRecipe.ingredients) {
        if (ing.ingredientType === "calculated" && ing.commodityId) {
          const matchedComm = commodities.find((c) => c.id === ing.commodityId);
          calcItems.push({
            commodity_id: ing.commodityId,
            quantity: 1,
            unit_label: matchedComm?.unit || "unit",
            weight_grams: ing.weightGrams || 100,
            estimated_cost: ing.estimatedCost || 0,
            cost_manual_override: true,
          });
        } else {
          addItems.push({
            ingredient_name: ing.name,
            amount_description: ing.amount,
            estimated_cost: ing.estimatedCost || 0,
          });
        }
      }

      if (calcItems.length > 0) {
        setCalculatedIngredients(calcItems);
      }
      setAdditionalIngredients(addItems);

      if (initialRecipe.highlights && initialRecipe.highlights.length > 0) {
        setHighlights(initialRecipe.highlights);
      }
      if (initialRecipe.instructions && initialRecipe.instructions.length > 0) {
        setInstructions(initialRecipe.instructions);
      }
    } else {
      // Reset form ke default
      const defaultCommodity = commodities[0];
      const defaultGramPerUnit = defaultCommodity?.gram_per_unit || 100;
      const defaultCost = defaultCommodity?.latest_price
        ? Math.round(defaultCommodity.latest_price)
        : 1000;

      setTitle("");
      setCategory("Stunting (TB/U)");
      setTargetAgeMin(12);
      setTargetAgeMax(59);
      setPrepTimeMinutes(30);
      setServings(1);
      setCostPerServing("");
      setCalculatedIngredients([
        {
          commodity_id: defaultCommodity?.id || "",
          quantity: 1,
          unit_label: defaultCommodity?.unit || "unit",
          weight_grams: defaultGramPerUnit,
          estimated_cost: defaultCost,
          cost_manual_override: false,
        },
      ]);
      setAdditionalIngredients([]);
      setHighlights(["Tinggi zat gizi esensial dari bahan pangan lokal terjangkau"]);
      setInstructions([
        "Persiapkan bahan dan cuci bersih dengan air mengalir.",
        "Kukus atau rebus hingga matang merata dan sajikan selagi hangat.",
      ]);
    }
  }, [initialRecipe, commodities]);

  // Buat lookup map komoditas
  const commodityMap = useMemo(() => {
    const map = new Map<string, CommodityWithNutrition>();
    commodities.forEach((c) => map.set(c.id, c));
    return map;
  }, [commodities]);

  // Buat lookup map nutrisi
  const nutritionMap = useMemo(() => {
    const map = new Map<string, CommodityNutrition>();
    commodities.forEach((c) => {
      if (c.nutrition) {
        map.set(c.id, {
          commodity_id: c.id,
          calories: c.nutrition.calories,
          protein: c.nutrition.protein,
          iron: c.nutrition.iron,
          zinc: c.nutrition.zinc,
          calcium: c.nutrition.calcium,
          fat: c.nutrition.fat,
        });
      }
    });
    return map;
  }, [commodities]);

  // Hitung Nutrisi Otomatis Secara Real-Time
  const liveNutrients = useMemo(() => {
    const validServings = typeof servings === "number" && servings > 0 ? servings : 1;
    return calculateNutrientsFromIngredients(
      calculatedIngredients.map((ing) => ({
        commodity_id: ing.commodity_id,
        weight_grams: typeof ing.weight_grams === "number" ? ing.weight_grams : 0,
      })),
      nutritionMap,
      validServings,
    );
  }, [calculatedIngredients, nutritionMap, servings]);

  // Hitung AKG berdasarkan referensi usia tengah
  const minAgeNum = typeof targetAgeMin === "number" ? targetAgeMin : 12;
  const maxAgeNum = typeof targetAgeMax === "number" ? targetAgeMax : 59;
  const midAge = Math.round((minAgeNum + maxAgeNum) / 2);
  const currentAkgRef = useMemo(() => getAkgReferenceForAge(midAge), [midAge]);

  const liveAkg = useMemo(() => {
    return calculateAkgPercentages(liveNutrients, currentAkgRef);
  }, [liveNutrients, currentAkgRef]);

  // Hitung Total Biaya otomatis jika belum diketik manual
  const totalCalculatedCost = useMemo(() => {
    const calcCost = calculatedIngredients.reduce((sum, item) => {
      const c = typeof item.estimated_cost === "number" ? item.estimated_cost : 0;
      return sum + c;
    }, 0);
    const addCost = additionalIngredients.reduce((sum, item) => {
      const c = typeof item.estimated_cost === "number" ? item.estimated_cost : 0;
      return sum + c;
    }, 0);
    const validServings = typeof servings === "number" && servings > 0 ? servings : 1;
    return Math.round((calcCost + addCost) / validServings);
  }, [calculatedIngredients, additionalIngredients, servings]);

  // Handlers untuk Calculated Ingredients
  const handleAddCalculated = () => {
    const com = commodities[0];
    const qty = 1;
    const gramPerUnit = com?.gram_per_unit || 100;
    const cost = com?.latest_price ? Math.round(com.latest_price * qty) : 1000;

    setCalculatedIngredients([
      ...calculatedIngredients,
      {
        commodity_id: com?.id || "",
        quantity: qty,
        unit_label: com?.unit || "unit",
        weight_grams: qty * gramPerUnit,
        estimated_cost: cost,
        cost_manual_override: false,
      },
    ]);
  };

  const handleCommodityChange = (index: number, newCommodityId: string) => {
    const com = commodityMap.get(newCommodityId);
    const updated = [...calculatedIngredients];
    
    // When changing ingredients, reset amount to default per-unit (1 unit) of the newly selected commodity
    const defaultQty = 1;
    const gramPerUnit = com?.gram_per_unit || 100;
    const defaultWeight = gramPerUnit;
    const defaultCost = com?.latest_price ? Math.round(com.latest_price * defaultQty) : 1000;

    updated[index] = {
      commodity_id: newCommodityId,
      quantity: defaultQty,
      unit_label: com?.unit || "unit",
      weight_grams: defaultWeight,
      estimated_cost: defaultCost,
      cost_manual_override: false,
    };
    setCalculatedIngredients(updated);
  };

  const handleQuantityChange = (index: number, valStr: string) => {
    const parsedQty = parseNumericInput(valStr, true);
    const updated = [...calculatedIngredients];
    const current = updated[index];
    const com = commodityMap.get(current.commodity_id);
    const gramPerUnit = com?.gram_per_unit || 100;

    let newWeight = current.weight_grams;
    let newCost = current.estimated_cost;

    if (typeof parsedQty === "number") {
      newWeight = Math.round(parsedQty * gramPerUnit * 10) / 10;
      if (!current.cost_manual_override && com?.latest_price) {
        newCost = Math.round(com.latest_price * parsedQty);
      }
    } else {
      newWeight = "";
      if (!current.cost_manual_override) {
        newCost = "";
      }
    }

    updated[index] = {
      ...current,
      quantity: parsedQty,
      weight_grams: newWeight,
      estimated_cost: newCost,
    };
    setCalculatedIngredients(updated);
  };

  const handleWeightChange = (index: number, valStr: string) => {
    const parsedWeight = parseNumericInput(valStr, true);
    const updated = [...calculatedIngredients];
    const current = updated[index];
    const com = commodityMap.get(current.commodity_id);
    const gramPerUnit = com?.gram_per_unit || 100;

    let newQty = current.quantity;
    let newCost = current.estimated_cost;

    if (typeof parsedWeight === "number" && gramPerUnit > 0) {
      newQty = Math.round((parsedWeight / gramPerUnit) * 100) / 100;
      if (!current.cost_manual_override && com?.latest_price) {
        newCost = Math.round((com.latest_price / gramPerUnit) * parsedWeight);
      }
    }

    updated[index] = {
      ...current,
      weight_grams: parsedWeight,
      quantity: newQty,
      estimated_cost: newCost,
    };
    setCalculatedIngredients(updated);
  };

  const handleCostChange = (index: number, valStr: string) => {
    const parsedCost = parseNumericInput(valStr, false);
    const updated = [...calculatedIngredients];
    updated[index] = {
      ...updated[index],
      estimated_cost: parsedCost,
      cost_manual_override: true,
    };
    setCalculatedIngredients(updated);
  };

  const handleRemoveCalculated = (index: number) => {
    if (calculatedIngredients.length <= 1) return;
    setCalculatedIngredients(calculatedIngredients.filter((_, i) => i !== index));
  };

  // Handlers untuk Additional Ingredients
  const handleAddAdditional = () => {
    setAdditionalIngredients([
      ...additionalIngredients,
      { ingredient_name: "", amount_description: "", estimated_cost: 500 },
    ]);
  };

  const handleUpdateAdditional = (
    index: number,
    field: keyof AdditionalItem,
    value: string | number,
  ) => {
    const updated = [...additionalIngredients];
    updated[index] = { ...updated[index], [field]: value };
    setAdditionalIngredients(updated);
  };

  const handleRemoveAdditional = (index: number) => {
    setAdditionalIngredients(additionalIngredients.filter((_, i) => i !== index));
  };

  // Handlers untuk Highlights
  const handleAddHighlight = () => {
    setHighlights([...highlights, ""]);
  };
  const handleUpdateHighlight = (index: number, value: string) => {
    const copy = [...highlights];
    copy[index] = value;
    setHighlights(copy);
  };
  const handleRemoveHighlight = (index: number) => {
    setHighlights(highlights.filter((_, i) => i !== index));
  };

  // Handlers untuk Instructions
  const handleAddInstruction = () => {
    setInstructions([...instructions, ""]);
  };
  const handleUpdateInstruction = (index: number, value: string) => {
    const copy = [...instructions];
    copy[index] = value;
    setInstructions(copy);
  };
  const handleRemoveInstruction = (index: number) => {
    if (instructions.length <= 1) return;
    setInstructions(instructions.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage("Nama resep tidak boleh kosong.");
      return;
    }

    if (
      calculatedIngredients.some(
        (i) =>
          !i.commodity_id ||
          typeof i.weight_grams !== "number" ||
          i.weight_grams <= 0,
      )
    ) {
      setErrorMessage("Harap lengkapi semua bahan gizi terhitung dengan berat > 0 gram.");
      return;
    }

    const filteredInstructions = instructions.filter((i) => i.trim().length > 0);
    if (filteredInstructions.length === 0) {
      setErrorMessage("Minimal harus ada 1 langkah cara pembuatan.");
      return;
    }

    setIsSubmitting(true);

    try {
      const minAge = typeof targetAgeMin === "number" ? targetAgeMin : 12;
      const maxAge = typeof targetAgeMax === "number" ? targetAgeMax : 59;
      const prepTime = typeof prepTimeMinutes === "number" ? prepTimeMinutes : 30;
      const servingsNum = typeof servings === "number" && servings > 0 ? servings : 1;
      const explicitCost = typeof costPerServing === "number" ? costPerServing : 0;

      const payload: RecipeFormData = {
        title: title.trim(),
        category,
        target_age_min_months: minAge,
        target_age_max_months: maxAge,
        preparation_time_minutes: prepTime,
        servings: servingsNum,
        cost_per_serving: explicitCost > 0 ? explicitCost : totalCalculatedCost,
        highlights: highlights.filter((h) => h.trim().length > 0),
        instructions: filteredInstructions,
        calculated_ingredients: calculatedIngredients.map((c) => ({
          commodity_id: c.commodity_id,
          quantity: typeof c.quantity === "number" ? c.quantity : 1,
          unit_label: c.unit_label || "unit",
          weight_grams: typeof c.weight_grams === "number" ? c.weight_grams : 50,
          estimated_cost: typeof c.estimated_cost === "number" ? c.estimated_cost : 0,
        })),
        additional_ingredients: additionalIngredients
          .filter((a) => a.ingredient_name.trim().length > 0)
          .map((a) => ({
            ingredient_name: a.ingredient_name.trim(),
            amount_description: a.amount_description.trim() || "Secukupnya",
            estimated_cost: typeof a.estimated_cost === "number" ? a.estimated_cost : 0,
          })),
      };

      let result;
      if (isEditing && initialRecipe) {
        result = await updateRecipe(initialRecipe.id, payload);
      } else {
        result = await createRecipe(payload);
      }

      if (!result.success) {
        setErrorMessage(result.error || "Gagal menyimpan data resep.");
        return;
      }

      onSuccess(result.message);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Terjadi kesalahan saat memproses data resep.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-3xl my-8 bg-card border rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-600/10 text-emerald-600">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                {isEditing ? "Edit Resep Gizi Cerdas" : "Tambah Resep Gizi Cerdas Baru"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isEditing
                  ? "Perbarui formulasi bahan gizi dan langkah memasak resep."
                  : "Kalkulasi otomatis nutrisi & harga pasar harian berbasis komoditas pangan lokal."}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Informasi Dasar Resep */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              1. Informasi Resep
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="recipe-title" className="text-xs">
                  Nama Menu Resep <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="recipe-title"
                  placeholder="Contoh: Bubur Tim Lele Wortel Padat Zink"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="recipe-category" className="text-xs">
                  Kategori Sasaran Defisit
                </Label>
                <select
                  id="recipe-category"
                  value={category}
                  onChange={(e) =>
                    setCategory(
                      e.target.value as
                        | "Stunting (TB/U)"
                        | "Wasting (BB/TB)"
                        | "Underweight (BB/U)"
                        | "Gizi Seimbang",
                    )
                  }
                  className="w-full text-xs h-9 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="Stunting (TB/U)">Stunting (TB/U)</option>
                  <option value="Wasting (BB/TB)">Wasting (BB/TB)</option>
                  <option value="Underweight (BB/U)">Underweight (BB/U)</option>
                  <option value="Gizi Seimbang">Gizi Seimbang</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Usia Min (Bulan)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    value={targetAgeMin}
                    onChange={(e) => setTargetAgeMin(parseNumericInput(e.target.value))}
                    className="text-xs h-9"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Usia Max (Bulan)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    value={targetAgeMax}
                    onChange={(e) => setTargetAgeMax(parseNumericInput(e.target.value))}
                    className="text-xs h-9"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Waktu Masak (Mnt)</Label>
                  <Input
                    type="number"
                    min={5}
                    value={prepTimeMinutes}
                    onChange={(e) => setPrepTimeMinutes(parseNumericInput(e.target.value))}
                    className="text-xs h-9"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Jumlah Porsi</Label>
                  <Input
                    type="number"
                    min={1}
                    value={servings}
                    onChange={(e) => setServings(parseNumericInput(e.target.value))}
                    className="text-xs h-9"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Estimasi Biaya / Porsi</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder={`Otomatis (${totalCalculatedCost})`}
                    value={costPerServing}
                    onChange={(e) => setCostPerServing(parseNumericInput(e.target.value))}
                    className="text-xs h-9"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Bahan Pangan Terhitung (Database commodity_nutrition & daily_prices) */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5" />
                  2. Bahan Terhitung Nutrisi (Dari Tabel Komoditas & Harga Harian)
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Pilih komoditas pangan. Masukkan takaran unit atau gram, harga dan nutrisi akan dikalkulasi otomatis.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                onClick={handleAddCalculated}
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Bahan
              </Button>
            </div>

            <div className="space-y-2.5">
              {calculatedIngredients.map((item, idx) => {
                const selectedCommodity = commodityMap.get(item.commodity_id);
                const unit = selectedCommodity?.unit || item.unit_label || "unit";
                const gramPerUnit = selectedCommodity?.gram_per_unit || 100;
                const marketPrice = selectedCommodity?.latest_price;

                return (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border bg-emerald-500/5 border-emerald-500/20 space-y-2"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                      {/* Dropdown Komoditas */}
                      <div className="sm:col-span-4">
                        <Label className="text-[10px] text-muted-foreground block mb-1">
                          Komoditas Pangan
                        </Label>
                        <select
                          value={item.commodity_id}
                          onChange={(e) => handleCommodityChange(idx, e.target.value)}
                          className="w-full text-xs h-8 px-2 rounded border border-input bg-background font-medium"
                        >
                          {commodities.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.unit})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Jumlah Takaran Satuan Komoditas */}
                      <div className="sm:col-span-2">
                        <Label className="text-[10px] text-muted-foreground block mb-1">
                          Jumlah ({unit})
                        </Label>
                        <Input
                          type="number"
                          step="any"
                          min="0.001"
                          placeholder="cth: 0.5 / 1"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(idx, e.target.value)}
                          className="text-xs h-8"
                        />
                      </div>

                      {/* Berat Bersih (Gram) */}
                      <div className="sm:col-span-2">
                        <Label className="text-[10px] text-muted-foreground block mb-1">
                          Gram ({gramPerUnit}g/{unit})
                        </Label>
                        <Input
                          type="number"
                          step="any"
                          min="0.1"
                          placeholder="gram"
                          value={item.weight_grams}
                          onChange={(e) => handleWeightChange(idx, e.target.value)}
                          className="text-xs h-8 font-mono"
                        />
                      </div>

                      {/* Estimasi Biaya */}
                      <div className="sm:col-span-3">
                        <Label className="text-[10px] text-muted-foreground flex items-center justify-between mb-1">
                          <span>Biaya (Rp)</span>
                          {marketPrice && (
                            <span className="text-[9px] text-emerald-600 font-mono">
                              Pasar: {marketPrice.toLocaleString("id-ID")}/{unit}
                            </span>
                          )}
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          value={item.estimated_cost}
                          onChange={(e) => handleCostChange(idx, e.target.value)}
                          className="text-xs h-8 font-mono"
                        />
                      </div>

                      {/* Tombol Hapus */}
                      <div className="sm:col-span-1 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={calculatedIngredients.length <= 1}
                          className="h-8 w-8 text-red-500 hover:text-red-700"
                          onClick={() => handleRemoveCalculated(idx)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Informasi Nutrisi Terhitung */}
                    {selectedCommodity?.nutrition && (
                      <div className="text-[10px] text-muted-foreground flex items-center gap-3 bg-background/70 px-2 py-1 rounded border border-dashed flex-wrap">
                        <span className="font-semibold text-foreground">
                          Nilai Gizi Per 100g:
                        </span>
                        <span>{selectedCommodity.nutrition.calories} kkal</span>
                        <span>• Protein: {selectedCommodity.nutrition.protein}g</span>
                        <span>• Zat Besi: {selectedCommodity.nutrition.iron}mg</span>
                        <span>• Zink: {selectedCommodity.nutrition.zinc}mg</span>
                        <span>• Kalsium: {selectedCommodity.nutrition.calcium}mg</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Bahan Tambahan (Dikecualikan dari Kalkulasi Nutrisi) */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-600" />
                  3. Bahan Tambahan / Bumbu (Dikecualikan dari Kalkulasi Nutrisi)
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Gunakan satuan fleksibel seperti sendok makan (sdm), cangkir, atau bumbu dapur yang tidak dihitung gizinya.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleAddAdditional}
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Bahan Dikecualikan
              </Button>
            </div>

            {additionalIngredients.length === 0 ? (
              <div className="p-3 rounded-lg border border-dashed text-center text-xs text-muted-foreground">
                Belum ada bahan tambahan. (Opsional, contoh: 1/2 cangkir air kaldu, 1 sdm kecap, secukupnya daun salam).
              </div>
            ) : (
              <div className="space-y-2">
                {additionalIngredients.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2.5 rounded-lg border border-dashed bg-muted/20"
                  >
                    <div className="sm:col-span-5">
                      <Label className="text-[10px] text-muted-foreground block mb-1">
                        Nama Bahan Tambahan
                      </Label>
                      <Input
                        placeholder="Contoh: Air Kaldu Sapi / Santan"
                        value={item.ingredient_name}
                        onChange={(e) =>
                          handleUpdateAdditional(idx, "ingredient_name", e.target.value)
                        }
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <Label className="text-[10px] text-muted-foreground block mb-1">
                        Takaran Bebas
                      </Label>
                      <Input
                        placeholder="Contoh: 1/2 cangkir / 1 sdt"
                        value={item.amount_description}
                        onChange={(e) =>
                          handleUpdateAdditional(
                            idx,
                            "amount_description",
                            e.target.value,
                          )
                        }
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <Label className="text-[10px] text-muted-foreground block mb-1">
                        Biaya (Rp)
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={item.estimated_cost}
                        onChange={(e) =>
                          handleUpdateAdditional(
                            idx,
                            "estimated_cost",
                            parseNumericInput(e.target.value),
                          )
                        }
                        className="text-xs h-8 font-mono"
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end pt-2 sm:pt-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-500"
                        onClick={() => handleRemoveAdditional(idx)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Real-time Nutrition & Cost Summary Card */}
          <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" />
                Hasil Kalkulasi Nutrisi Otomatis (Per Porsi)
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] bg-background gap-1 text-emerald-600 font-semibold">
                  <Coins className="w-3 h-3" /> Rp{totalCalculatedCost.toLocaleString("id-ID")}/porsi
                </Badge>
                <Badge variant="outline" className="text-[10px] bg-background">
                  AKG Usia {midAge} Bulan ({currentAkgRef.age_group_code})
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              <div className="p-2 rounded bg-card border">
                <span className="text-[10px] text-muted-foreground block">Kalori</span>
                <span className="font-bold text-xs text-foreground">
                  {liveNutrients.calories} kkal
                </span>
                <span className="text-[10px] text-emerald-600 block font-medium">
                  {liveAkg.calories}% AKG
                </span>
              </div>
              <div className="p-2 rounded bg-card border">
                <span className="text-[10px] text-muted-foreground block">Protein</span>
                <span className="font-bold text-xs text-foreground">
                  {liveNutrients.protein} g
                </span>
                <span className="text-[10px] text-emerald-600 block font-medium">
                  {liveAkg.protein}% AKG
                </span>
              </div>
              <div className="p-2 rounded bg-card border">
                <span className="text-[10px] text-muted-foreground block">Zat Besi</span>
                <span className="font-bold text-xs text-foreground">
                  {liveNutrients.iron} mg
                </span>
                <span className="text-[10px] text-emerald-600 block font-medium">
                  {liveAkg.iron}% AKG
                </span>
              </div>
              <div className="p-2 rounded bg-card border">
                <span className="text-[10px] text-muted-foreground block">Zink</span>
                <span className="font-bold text-xs text-foreground">
                  {liveNutrients.zinc} mg
                </span>
                <span className="text-[10px] text-emerald-600 block font-medium">
                  {liveAkg.zinc}% AKG
                </span>
              </div>
              <div className="p-2 rounded bg-card border">
                <span className="text-[10px] text-muted-foreground block">Kalsium</span>
                <span className="font-bold text-xs text-foreground">
                  {liveNutrients.calcium} mg
                </span>
                <span className="text-[10px] text-emerald-600 block font-medium">
                  {liveAkg.calcium}% AKG
                </span>
              </div>
            </div>
          </div>

          {/* 4. Langkah Memasak */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  4. Langkah Pengolahan (Higienis)
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Petunjuk praktis untuk keluarga balita.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleAddInstruction}
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Tahap
              </Button>
            </div>

            <div className="space-y-2">
              {instructions.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground w-5 text-right">
                    {idx + 1}.
                  </span>
                  <Input
                    value={step}
                    onChange={(e) => handleUpdateInstruction(idx, e.target.value)}
                    placeholder={`Langkah ke-${idx + 1}`}
                    className="text-xs h-8 flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={instructions.length <= 1}
                    className="h-7 w-7 text-muted-foreground hover:text-red-500"
                    onClick={() => handleRemoveInstruction(idx)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Highlight Resep */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  5. Keunggulan Gizi (Highlights)
                </h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleAddHighlight}
              >
                <Plus className="w-3.5 h-3.5" /> Tambah
              </Button>
            </div>

            <div className="space-y-2">
              {highlights.map((h, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={h}
                    onChange={(e) => handleUpdateHighlight(idx, e.target.value)}
                    placeholder="Contoh: Mengandung asam amino esensial tinggi untuk percepatan tinggi badan"
                    className="text-xs h-8 flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-red-500"
                    onClick={() => handleRemoveHighlight(idx)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Tombol Aksi */}
          <div className="pt-4 border-t flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              {isSubmitting ? (
                "Menyimpan Resep..."
              ) : isEditing ? (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Simpan Perubahan Resep
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Simpan Resep Gizi
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
