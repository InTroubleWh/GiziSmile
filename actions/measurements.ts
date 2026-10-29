"use server";

import { createClient } from "@/lib/supabase/server";
import { measurementSchema, MeasurementFormData } from "@/lib/validators";
import { calculateZScore, ZScoreResult } from "@/lib/zscore";
import { revalidatePath } from "next/cache";

export interface CreateMeasurementResponse {
  success: boolean;
  zScores?: ZScoreResult;
  error?: string;
}

export interface SyncResponse {
  success: boolean;
  syncedCount: number;
  totalCount: number;
  errors: string[];
}

export async function createMeasurement(
  data: MeasurementFormData,
): Promise<CreateMeasurementResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      const isNetworkIssue =
        userError.message?.toLowerCase().includes("fetch") ||
        userError.message?.toLowerCase().includes("network") ||
        userError.name === "AuthRetryableFetchError";

      if (isNetworkIssue) {
        return {
          success: false,
          error: "Koneksi ke server autentikasi terputus (jaringan offline).",
        };
      }

      return {
        success: false,
        error: "Sesi login tidak ditemukan. Silakan masuk terlebih dahulu.",
      };
    }

    if (!user) {
      return {
        success: false,
        error: "Sesi login tidak ditemukan. Silakan masuk terlebih dahulu.",
      };
    }

    // Role check: kader, nutritionist, dan admin yang berhak menulis data pengukuran
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.warn("Gagal membaca profil pengguna:", profileError.message);
    }

    const userRole = profile?.role;
    if (userRole && !["kader", "nutritionist", "admin"].includes(userRole)) {
      return {
        success: false,
        error: "Akses ditolak: Hanya Kader Posyandu, Ahli Gizi, atau Administrator yang diizinkan mencatat pengukuran.",
      };
    }

    const validated = measurementSchema.parse(data);
    const zScores = calculateZScore(validated);

    const { error: insertError } = await supabase.from("measurements").insert({
      child_id: validated.child_id,
      measured_at: validated.measured_at,
      age_months: validated.age_months,
      height_cm: validated.height_cm,
      weight_kg: validated.weight_kg,
      zscore_hfa: zScores.zscore_hfa,
      zscore_wfa: zScores.zscore_wfa,
      zscore_wfh: zScores.zscore_wfh,
    });

    if (insertError) {
      return {
        success: false,
        error: `Gagal menyimpan ke database: ${insertError.message}`,
      };
    }

    revalidatePath("/z-score");
    revalidatePath("/children");
    revalidatePath("/analytics");
    revalidatePath("/recipes");

    return {
      success: true,
      zScores,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan sistem";
    return {
      success: false,
      error: message,
    };
  }
}

export async function syncOfflineMeasurements(
  items: MeasurementFormData[],
): Promise<SyncResponse> {
  let syncedCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const res = await createMeasurement(item);
    if (res.success) {
      syncedCount++;
    } else {
      errors.push(`Item #${i + 1}: ${res.error || "Gagal menyimpan"}`);
    }
  }

  return {
    success: errors.length === 0,
    syncedCount,
    totalCount: items.length,
    errors,
  };
}
