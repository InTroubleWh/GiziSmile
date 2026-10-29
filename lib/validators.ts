import { z } from "zod";

export const genderSchema = z.enum(["male", "female"]);

export const measurementSchema = z.object({
  child_id: z.string().min(1, "Anak wajib dipilih"),
  measured_at: z
    .string()
    .min(1, "Tanggal pengukuran wajib diisi")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
  age_months: z
    .number()
    .int("Usia bulan harus bilangan bulat")
    .min(0, "Usia minimal 0 bulan")
    .max(60, "Usia maksimal 60 bulan (5 tahun)"),
  height_cm: z
    .number()
    .min(45, "Tinggi badan minimal 45 cm")
    .max(120, "Tinggi badan maksimal 120 cm"),
  weight_kg: z
    .number()
    .min(1.5, "Berat badan minimal 1.5 kg")
    .max(35, "Berat badan maksimal 35 kg"),
  gender: genderSchema,
});

export type MeasurementFormData = z.infer<typeof measurementSchema>;

export const parentRelationSchema = z.enum(["ayah", "ibu", "wali"]);
export type ParentRelation = z.infer<typeof parentRelationSchema>;

export const childSchema = z.object({
  name: z.string().min(2, "Nama anak minimal 2 karakter"),
  birth_date: z
    .string()
    .min(1, "Tanggal lahir wajib diisi")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
  gender: genderSchema,
  region: z.string().min(2, "Wilayah/Desa minimal 2 karakter"),
  parent_id: z.string().uuid("ID orang tua tidak valid").optional().or(z.literal("")),
  relationship: parentRelationSchema.optional(),
});

export type ChildFormData = z.infer<typeof childSchema>;

export const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export type UserRole = "admin" | "nutritionist" | "kader" | "parent";

export const staffUserSchema = z.object({
  fullName: z.string().min(2, "Nama lengkap minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum(["kader", "nutritionist"]),
});

export type StaffUserFormData = z.infer<typeof staffUserSchema>;

export const profileSchema = z.object({
  fullName: z.string().min(2, "Nama lengkap minimal 2 karakter"),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

export const roleRequestSchema = z.object({
  requestedRole: z.enum(["nutritionist", "kader", "parent"], {
    message: "Pilih peran yang valid",
  }),
  reason: z
    .string({ message: "Alasan permohonan wajib diisi" })
    .trim()
    .min(1, "Alasan permohonan wajib diisi, tidak boleh kosong")
    .min(10, "Alasan permohonan minimal 10 karakter (jelaskan instansi bertugas atau tujuan Anda)"),
});

export type RoleRequestFormData = z.infer<typeof roleRequestSchema>;

export interface OfflineQueueItem extends MeasurementFormData {
  local_id: string;
  queued_at: string;
  child_name?: string;
  preview_zscores?: {
    zscore_hfa: number;
    zscore_wfa: number;
    zscore_wfh: number;
    status_hfa: string;
    status_wfa: string;
    status_wfh: string;
    needs_intervention: boolean;
  };
}

export const calculatedIngredientSchema = z.object({
  commodity_id: z.string().min(1, "Komoditas wajib dipilih"),
  quantity: z.coerce.number().positive("Jumlah unit harus lebih dari 0").default(1),
  unit_label: z.string().min(1, "Satuan wajib ada").default("unit"),
  weight_grams: z.coerce.number().positive("Berat harus lebih dari 0 gram"),
  estimated_cost: z.coerce.number().min(0, "Estimasi biaya tidak boleh negatif").default(0),
});

export const additionalIngredientSchema = z.object({
  ingredient_name: z.string().min(1, "Nama bahan wajib diisi"),
  amount_description: z.string().min(1, "Takaran wajib diisi (contoh: 1 sdm, 1/2 cangkir)"),
  estimated_cost: z.coerce.number().min(0, "Estimasi biaya tidak boleh negatif").default(0),
});

export const recipeSchema = z.object({
  title: z.string().trim().min(3, "Nama resep minimal 3 karakter"),
  category: z.enum([
    "Stunting (TB/U)",
    "Wasting (BB/TB)",
    "Underweight (BB/U)",
    "Gizi Seimbang",
  ]),
  target_age_min_months: z.coerce.number().int().min(0).max(60),
  target_age_max_months: z.coerce.number().int().min(0).max(60),
  preparation_time_minutes: z.coerce.number().int().positive("Waktu memasak harus lebih dari 0"),
  servings: z.coerce.number().int().positive("Jumlah porsi minimal 1").default(1),
  cost_per_serving: z.coerce.number().min(0).default(0),
  highlights: z.array(z.string().trim()).default([]),
  instructions: z.array(z.string().trim().min(1)).min(1, "Langkah memasak minimal 1 tahap"),
  calculated_ingredients: z.array(calculatedIngredientSchema).min(1, "Minimal 1 bahan pangan bernutrisi terhitung"),
  additional_ingredients: z.array(additionalIngredientSchema).default([]),
}).refine((data) => data.target_age_max_months >= data.target_age_min_months, {
  message: "Usia maksimal tidak boleh lebih kecil dari usia minimal",
  path: ["target_age_max_months"],
});

export type RecipeFormData = z.infer<typeof recipeSchema>;
export type CalculatedIngredientData = z.infer<typeof calculatedIngredientSchema>;
export type AdditionalIngredientData = z.infer<typeof additionalIngredientSchema>;


