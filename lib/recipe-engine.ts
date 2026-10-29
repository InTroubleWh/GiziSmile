import offlineAkgData from "./offline_akg_references.json";

export interface AkgReference {
  id?: string;
  age_group_code: string;
  age_min_months: number;
  age_max_months: number;
  calories_kcal: number;
  protein_g: number;
  fat_g?: number;
  calcium_mg: number;
  iron_mg: number;
  zinc_mg: number;
  source?: string;
  source_year?: number;
}

export const OFFLINE_AKG_REFERENCES: AkgReference[] = offlineAkgData as AkgReference[];

/**
 * Mendapatkan referensi AKG harian berdasarkan usia balita dalam bulan
 */
export function getAkgReferenceForAge(ageMonths: number): AkgReference {
  const matched = OFFLINE_AKG_REFERENCES.find(
    (ref) => ageMonths >= ref.age_min_months && ageMonths <= ref.age_max_months,
  );

  if (matched) return matched;

  // Default fallback jika usia tidak dalam rentang khusus (contoh: 12-36 bulan)
  return (
    OFFLINE_AKG_REFERENCES.find((ref) => ref.age_group_code === "12_36") ||
    OFFLINE_AKG_REFERENCES[2] || {
      age_group_code: "12_36",
      age_min_months: 12,
      age_max_months: 36,
      calories_kcal: 1350,
      protein_g: 20,
      fat_g: 45,
      calcium_mg: 650,
      iron_mg: 7,
      zinc_mg: 3,
    }
  );
}

export interface CommodityNutrition {
  commodity_id: string;
  calories: number;
  protein: number;
  iron: number;
  zinc: number;
  calcium: number;
  fat?: number;
}

export interface RecipeNutrient {
  calories: number; // kkal
  protein: number; // gram
  iron: number; // mg
  zinc: number; // mg
  calcium: number; // mg
  fat?: number; // gram
}

export interface RecipeIngredient {
  id?: string;
  ingredientType: "calculated" | "additional";
  name: string;
  amount: string;
  estimatedCost: number; // Rupiah
  isLocalHero?: boolean;
  weightGrams?: number;
  commodityId?: string;
}

export interface SmartRecipe {
  id: string;
  title: string;
  category: "Stunting (TB/U)" | "Wasting (BB/TB)" | "Underweight (BB/U)" | "Gizi Seimbang";
  targetAge: string;
  targetAgeMinMonths?: number;
  targetAgeMaxMonths?: number;
  costPerServing: number;
  preparationTime: string;
  preparationTimeMinutes?: number;
  servings: number;
  nutrients: RecipeNutrient;
  akgPercentage: {
    protein: number;
    iron: number;
    zinc: number;
    calcium: number;
    calories?: number;
  };
  highlights: string[];
  ingredients: RecipeIngredient[];
  instructions: string[];
  createdBy?: string;
  creatorName?: string;
  source?: "database" | "template";
}

export interface DeficitCondition {
  is_stunted?: boolean;
  is_underweight?: boolean;
  is_wasted?: boolean;
  child_name?: string;
  age_months?: number;
}

/**
 * Menghitung total nutrisi dari daftar bahan berbasis gramasi dan commodity_nutrition (per 100 gram)
 */
export function calculateNutrientsFromIngredients(
  ingredients: Array<{ commodity_id: string; weight_grams: number }>,
  nutritionMap: Map<string, CommodityNutrition>,
  servings: number = 1,
): RecipeNutrient {
  let totalCalories = 0;
  let totalProtein = 0;
  let totalIron = 0;
  let totalZinc = 0;
  let totalCalcium = 0;
  let totalFat = 0;

  const validServings = Math.max(1, servings);

  for (const item of ingredients) {
    const nut = nutritionMap.get(item.commodity_id);
    if (!nut) continue;
    const factor = item.weight_grams / 100;
    totalCalories += (nut.calories || 0) * factor;
    totalProtein += (nut.protein || 0) * factor;
    totalIron += (nut.iron || 0) * factor;
    totalZinc += (nut.zinc || 0) * factor;
    totalCalcium += (nut.calcium || 0) * factor;
    totalFat += (nut.fat || 0) * factor;
  }

  // Hitung nilai per porsi
  return {
    calories: Math.round((totalCalories / validServings) * 10) / 10,
    protein: Math.round((totalProtein / validServings) * 10) / 10,
    iron: Math.round((totalIron / validServings) * 10) / 10,
    zinc: Math.round((totalZinc / validServings) * 10) / 10,
    calcium: Math.round((totalCalcium / validServings) * 10) / 10,
    fat: Math.round((totalFat / validServings) * 10) / 10,
  };
}

/**
 * Menghitung persentase AKG balita untuk resep berdasarkan referensi AKG
 */
export function calculateAkgPercentages(
  nutrients: RecipeNutrient,
  akg: AkgReference,
): {
  protein: number;
  iron: number;
  zinc: number;
  calcium: number;
  calories: number;
} {
  return {
    protein: Math.round(((nutrients.protein || 0) / (akg.protein_g || 20)) * 100),
    iron: Math.round(((nutrients.iron || 0) / (akg.iron_mg || 7)) * 100),
    zinc: Math.round(((nutrients.zinc || 0) / (akg.zinc_mg || 3)) * 100),
    calcium: Math.round(((nutrients.calcium || 0) / (akg.calcium_mg || 650)) * 100),
    calories: Math.round(((nutrients.calories || 0) / (akg.calories_kcal || 1350)) * 100),
  };
}

// Master Template Resep Gizi Cerdas Berbasis Pangan Lokal Terjangkau (Default Seed/Fallback)
export const RECIPE_TEMPLATES: SmartRecipe[] = [
  {
    id: "resep-lele-kelor",
    title: "Nugget Kukus Lele & Daun Kelor",
    category: "Stunting (TB/U)",
    targetAge: "12 - 59 Bulan",
    targetAgeMinMonths: 12,
    targetAgeMaxMonths: 59,
    costPerServing: 4800,
    preparationTime: "30 Menit",
    preparationTimeMinutes: 30,
    servings: 1,
    nutrients: {
      calories: 215,
      protein: 19.8,
      iron: 3.2,
      zinc: 1.6,
      calcium: 255,
    },
    akgPercentage: {
      protein: 99, // 19.8 / 20g
      iron: 46, // 3.2 / 7mg
      zinc: 53, // 1.6 / 3mg
      calcium: 39, // 255 / 650mg
    },
    highlights: [
      "Protein hewani ikan lele lokal tinggi asam amino esensial",
      "Kandungan kalsium & zat besi daun kelor untuk pemadatan tulang",
      "Biaya sangat hemat (< Rp5.000/porsi)",
    ],
    ingredients: [
      {
        ingredientType: "calculated",
        name: "Fillet Daging Ikan Lele Lokal",
        amount: "80 gram",
        weightGrams: 80,
        commodityId: "com_lele",
        estimatedCost: 2200,
        isLocalHero: true,
      },
      {
        ingredientType: "calculated",
        name: "Daun Kelor Segar (Cincang Halus)",
        amount: "20 gram",
        weightGrams: 20,
        commodityId: "com_kelor",
        estimatedCost: 500,
        isLocalHero: true,
      },
      {
        ingredientType: "calculated",
        name: "Telur Ayam Ras",
        amount: "30 gram (1/2 butir)",
        weightGrams: 30,
        commodityId: "com_telur",
        estimatedCost: 900,
        isLocalHero: true,
      },
      {
        ingredientType: "additional",
        name: "Tepung Tapioka & Terigu",
        amount: "2 sdm",
        estimatedCost: 500,
      },
      {
        ingredientType: "additional",
        name: "Bawang Putih & Garam Beriodium",
        amount: "Secukupnya",
        estimatedCost: 700,
      },
    ],
    instructions: [
      "Haluskan daging lele bersama bawang putih dan sedikit garam.",
      "Campurkan cincangan daun kelor, kocokan telur, dan tepung tapioka hingga kalis merata.",
      "Tuang adonan ke dalam loyang tahan panas yang telah diolesi sedikit minyak.",
      "Kukus selama 20 menit hingga matang sempurna, lalu potong-potong sesuai porsi makan anak.",
      "Dapat disajikan langsung selagi hangat bersama nasi lembek.",
    ],
    source: "template",
  },
  {
    id: "resep-hati-bayam",
    title: "Bubur Tim Hati Ayam & Bayam Merah Gurih",
    category: "Stunting (TB/U)",
    targetAge: "6 - 24 Bulan",
    targetAgeMinMonths: 6,
    targetAgeMaxMonths: 24,
    costPerServing: 5200,
    preparationTime: "25 Menit",
    preparationTimeMinutes: 25,
    servings: 1,
    nutrients: {
      calories: 295,
      protein: 19.5,
      iron: 10.3,
      zinc: 2.1,
      calcium: 210,
    },
    akgPercentage: {
      protein: 98,
      iron: 147, // Sangat tinggi zat besi heme untuk mencegah & merehabilitasi anemia stunting
      zinc: 70,
      calcium: 32,
    },
    highlights: [
      "Sumber zat besi heme terbaik dari hati ayam (bioavailabilitas tinggi)",
      "Mencegah anemia defisiensi besi penyebab hambatan pertumbuhan otak",
      "Tekstur lembut ramah pencernaan balita",
    ],
    ingredients: [
      {
        ingredientType: "calculated",
        name: "Hati Ayam Segar (Rebus & Cincang)",
        amount: "50 gram",
        weightGrams: 50,
        commodityId: "com_hati_ayam",
        estimatedCost: 2000,
        isLocalHero: true,
      },
      {
        ingredientType: "calculated",
        name: "Beras Putih Pulen",
        amount: "40 gram",
        weightGrams: 40,
        commodityId: "com_beras",
        estimatedCost: 1000,
      },
      {
        ingredientType: "calculated",
        name: "Daun Bayam Hijau/Merah",
        amount: "25 gram",
        weightGrams: 25,
        commodityId: "com_bayam",
        estimatedCost: 500,
        isLocalHero: true,
      },
      {
        ingredientType: "calculated",
        name: "Tahu Putih Halus",
        amount: "30 gram",
        weightGrams: 30,
        commodityId: "com_tahu",
        estimatedCost: 700,
        isLocalHero: true,
      },
      {
        ingredientType: "additional",
        name: "Minyak Kelapa / Santan Segar",
        amount: "1 sdt",
        estimatedCost: 1000,
      },
    ],
    instructions: [
      "Rebus beras bersama air kaldu hingga menjadi bubur beras yang lembut.",
      "Tumis hati ayam cincang dengan sedikit minyak kelapa dan bawang putih hingga harum.",
      "Masukkan tumisan hati ayam dan tahu lumat ke dalam bubur yang sedang mendidih.",
      "Tambahkan daun bayam pada 3 menit terakhir agar vitamin tidak rusak.",
      "Aduk hingga kekentalan pas, saring atau haluskan sesuai tahapan usia balita.",
    ],
    source: "template",
  },
  {
    id: "resep-rolade-tempe-telur",
    title: "Rolade Tempe & Telur Padat Kalori",
    category: "Wasting (BB/TB)",
    targetAge: "12 - 59 Bulan",
    targetAgeMinMonths: 12,
    targetAgeMaxMonths: 59,
    costPerServing: 4200,
    preparationTime: "25 Menit",
    preparationTimeMinutes: 25,
    servings: 1,
    nutrients: {
      calories: 285,
      protein: 14.5,
      iron: 3.1,
      zinc: 1.6,
      calcium: 165,
    },
    akgPercentage: {
      protein: 72,
      iron: 44,
      zinc: 53,
      calcium: 25,
    },
    highlights: [
      "Padat kalori dan protein untuk menaikkan berat badan balita wasting secara bertahap",
      "Perpaduan protein nabati tempe fermentasi dan protein hewani telur ayam",
      "Bahan dapat dibeli di warung desa mana pun",
    ],
    ingredients: [
      {
        ingredientType: "calculated",
        name: "Tempe Kedelai (Kukus & Haluskan)",
        amount: "75 gram",
        weightGrams: 75,
        commodityId: "com_tempe",
        estimatedCost: 1500,
        isLocalHero: true,
      },
      {
        ingredientType: "calculated",
        name: "Telur Ayam Ras (Didadar Tipis)",
        amount: "60 gram (1 butir)",
        weightGrams: 60,
        commodityId: "com_telur",
        estimatedCost: 1800,
        isLocalHero: true,
      },
      {
        ingredientType: "calculated",
        name: "Wortel Parut",
        amount: "20 gram",
        weightGrams: 20,
        commodityId: "com_wortel",
        estimatedCost: 400,
      },
      {
        ingredientType: "additional",
        name: "Minyak Goreng untuk Olesan",
        amount: "1 sdt",
        estimatedCost: 500,
      },
    ],
    instructions: [
      "Campurkan tempe halus bersama parutan wortel, sedikit garam, dan bumbu halus.",
      "Buat dadar telur tipis di atas wajan anti lengket sebagai lapisan kulit.",
      "Ratakan adonan tempe di atas lembaran telur dadar, lalu gulung rapat memanjang.",
      "Bungkus gulungan dengan daun pisang atau plastik tahan panas, kukus selama 20 menit.",
      "Potong melintang menjadi 5-6 bagian menarik menyerupai roda sebelum disajikan.",
    ],
    source: "template",
  },
  {
    id: "resep-sup-ikan-tahu",
    title: "Sup Kuah Kuning Ikan Gabus & Tahu Sutra",
    category: "Underweight (BB/U)",
    targetAge: "9 - 59 Bulan",
    targetAgeMinMonths: 9,
    targetAgeMaxMonths: 59,
    costPerServing: 5900,
    preparationTime: "30 Menit",
    preparationTimeMinutes: 30,
    servings: 1,
    nutrients: {
      calories: 230,
      protein: 17.2,
      iron: 2.8,
      zinc: 1.9,
      calcium: 210,
    },
    akgPercentage: {
      protein: 86,
      iron: 40,
      zinc: 63,
      calcium: 32,
    },
    highlights: [
      "Kaya albumin alami dari ikan tawar untuk pemulihan jaringan tubuh",
      "Kalsium tinggi dari tahu lokal ramah anggaran",
      "Kuah gurih rempah kunyit merangsang nafsu makan anak",
    ],
    ingredients: [
      {
        ingredientType: "calculated",
        name: "Daging Ikan Air Tawar (Gabus/Nila/Lele)",
        amount: "70 gram",
        weightGrams: 70,
        commodityId: "com_gabus",
        estimatedCost: 3200,
        isLocalHero: true,
      },
      {
        ingredientType: "calculated",
        name: "Tahu Putih Lembut (Potong Dadu)",
        amount: "50 gram",
        weightGrams: 50,
        commodityId: "com_tahu",
        estimatedCost: 1000,
        isLocalHero: true,
      },
      {
        ingredientType: "calculated",
        name: "Tomat Segar",
        amount: "25 gram",
        weightGrams: 25,
        commodityId: "com_tomat",
        estimatedCost: 400,
      },
      {
        ingredientType: "additional",
        name: "Daun Bawang & Seledri",
        amount: "1 batang",
        estimatedCost: 300,
      },
      {
        ingredientType: "additional",
        name: "Kunyit, Jahe, Bawang Merah, Bawang Putih",
        amount: "Bumbu Halus",
        estimatedCost: 1000,
      },
    ],
    instructions: [
      "Tumis bumbu halus (kunyit, jahe, bawang) hingga wangi dan tidak langu.",
      "Tuangkan air kaldu mendidih, masukkan potongan daging ikan segar.",
      "Masukkan dadu tahu lembut dan potongan tomat segar.",
      "Masak dengan api sedang hingga kuah meresap dan ikan matang sempurna.",
      "Sajikan selagi hangat bersama nasi lembek bertabur bawang goreng renyah.",
    ],
    source: "template",
  },
];

/**
 * Menghasilkan daftar resep gizi cerdas yang disesuaikan dengan kondisi antropometri dan usia anak
 */
export function generateSmartRecipes(
  condition?: DeficitCondition,
  availableRecipes: SmartRecipe[] = RECIPE_TEMPLATES,
): SmartRecipe[] {
  const combined = availableRecipes && availableRecipes.length > 0 ? availableRecipes : RECIPE_TEMPLATES;

  if (!condition) {
    return combined;
  }

  const { is_stunted, is_wasted, is_underweight, age_months } = condition;
  const targetAkg = typeof age_months === "number" ? getAkgReferenceForAge(age_months) : null;

  // Sesuaikan % AKG dinamis jika ada target usia anak
  const recipesWithDynamicAkg = combined.map((recipe) => {
    if (!targetAkg) return recipe;
    return {
      ...recipe,
      akgPercentage: calculateAkgPercentages(recipe.nutrients, targetAkg),
    };
  });

  return [...recipesWithDynamicAkg].sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    // Prioritas kecocokan rentang usia anak jika diberikan
    if (typeof age_months === "number") {
      const aMatchesAge =
        (a.targetAgeMinMonths === undefined || age_months >= a.targetAgeMinMonths) &&
        (a.targetAgeMaxMonths === undefined || age_months <= a.targetAgeMaxMonths);
      const bMatchesAge =
        (b.targetAgeMinMonths === undefined || age_months >= b.targetAgeMinMonths) &&
        (b.targetAgeMaxMonths === undefined || age_months <= b.targetAgeMaxMonths);

      if (aMatchesAge) scoreA += 15;
      if (bMatchesAge) scoreB += 15;
    }

    if (is_stunted) {
      if (a.category.includes("Stunting")) scoreA += 20;
      if (b.category.includes("Stunting")) scoreB += 20;
      // Bonus jika zat besi & protein tinggi
      scoreA += (a.nutrients.iron || 0) * 2 + (a.nutrients.protein || 0);
      scoreB += (b.nutrients.iron || 0) * 2 + (b.nutrients.protein || 0);
    }

    if (is_wasted) {
      if (a.category.includes("Wasting")) scoreA += 20;
      if (b.category.includes("Wasting")) scoreB += 20;
      // Bonus jika kalori tinggi
      scoreA += (a.nutrients.calories || 0) / 10;
      scoreB += (b.nutrients.calories || 0) / 10;
    }

    if (is_underweight) {
      if (a.category.includes("Underweight")) scoreA += 15;
      if (b.category.includes("Underweight")) scoreB += 15;
      scoreA += a.nutrients.protein || 0;
      scoreB += b.nutrients.protein || 0;
    }

    // Default ranking jika gizi seimbang
    if (!is_stunted && !is_wasted && !is_underweight) {
      if (a.category.includes("Gizi Seimbang")) scoreA += 10;
      if (b.category.includes("Gizi Seimbang")) scoreB += 10;
    }

    return scoreB - scoreA;
  });
}
