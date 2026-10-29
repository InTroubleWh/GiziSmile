"use server";

import { createClient } from "@/lib/supabase/server";
import { childSchema, ChildFormData } from "@/lib/validators";
import { revalidatePath } from "next/cache";

export interface ChildParentRelation {
  parent_id: string;
  relationship: "ayah" | "ibu" | "wali";
  parent?: {
    id: string;
    full_name: string | null;
  };
}

export interface ChildWithLatestMeasurement {
  id: string;
  name: string;
  birth_date: string;
  gender: "male" | "female";
  region: string;
  created_at: string;
  parents?: ChildParentRelation[];
  measurements?: Array<{
    id: string;
    measured_at: string;
    age_months: number;
    height_cm: number;
    weight_kg: number;
    zscore_hfa: number;
    zscore_wfa: number;
    zscore_wfh: number;
  }>;
}

export async function getChildren(): Promise<{
  data: ChildWithLatestMeasurement[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    // Ambil data balita beserta pengukuran & relasi orang tua
    // RLS policy Supabase yang aktif otomatis menyaring record anak jika user adalah parent
    const { data, error } = await supabase
      .from("children")
      .select("*, measurements(*), children_parents(parent_id, relationship, profiles:parent_id(id, full_name))")
      .order("created_at", { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    interface RawChildRow extends Omit<ChildWithLatestMeasurement, "parents"> {
      children_parents?: Array<{
        parent_id: string;
        relationship: "ayah" | "ibu" | "wali";
        profiles?: {
          id: string;
          full_name: string | null;
        } | null;
      }>;
    }

    const formatted: ChildWithLatestMeasurement[] = ((data as unknown as RawChildRow[]) || []).map((c) => ({
      ...c,
      parents: (c.children_parents || []).map((cp) => ({
        parent_id: cp.parent_id,
        relationship: cp.relationship,
        parent: cp.profiles || undefined,
      })),
    }));

    return { data: formatted };
  } catch (err: unknown) {
    return {
      data: [],
      error: err instanceof Error ? err.message : "Gagal mengambil data anak",
    };
  }
}

export async function getChildById(id: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("children")
      .select("*, measurements(*)")
      .eq("id", id)
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Gagal mengambil data anak",
    };
  }
}

export async function createChild(data: ChildFormData) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Silakan login terlebih dahulu" };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role && !["kader", "nutritionist", "admin"].includes(profile.role)) {
      return {
        success: false,
        error: "Hanya Kader Posyandu, Ahli Gizi, atau Administrator yang diizinkan mendaftarkan balita.",
      };
    }

    const validated = childSchema.parse(data);
    const { data: inserted, error: insertError } = await supabase
      .from("children")
      .insert({
        name: validated.name,
        birth_date: validated.birth_date,
        gender: validated.gender,
        region: validated.region,
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    // Jika kader memilih orang tua, hubungkan ke tabel public.children_parents
    if (validated.parent_id && validated.parent_id.trim() !== "") {
      const { error: relError } = await supabase
        .from("children_parents")
        .insert({
          child_id: inserted.id,
          parent_id: validated.parent_id,
          relationship: validated.relationship || "ibu",
        });

      if (relError) {
        console.error("Gagal menghubungkan balita ke orang tua:", relError);
        // Tetap lanjut karena data balita sudah tercatat, tapi beri info jika perlu
      }
    }

    revalidatePath("/children");
    revalidatePath("/z-score");
    revalidatePath("/analytics");
    return { success: true, data: inserted };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Terjadi kesalahan sistem",
    };
  }
}

/**
 * Memperbarui data induk balita (dan orang tua yang ditautkan)
 */
export async function updateChild(childId: string, data: ChildFormData) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Silakan login terlebih dahulu" };
    }

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

    if (profile?.role && !["kader", "nutritionist", "admin"].includes(profile.role)) {
      return {
        success: false,
        error: "Akses ditolak: Hanya Kader Posyandu, Ahli Gizi, atau Administrator yang diizinkan mengubah data balita.",
      };
    }

    const validated = childSchema.parse(data);

    // 1. Update data balita di tabel children
    const { data: updatedChild, error: updateError } = await supabase
      .from("children")
      .update({
        name: validated.name,
        birth_date: validated.birth_date,
        gender: validated.gender,
        region: validated.region,
      })
      .eq("id", childId)
      .select()
      .single();

    if (updateError) {
      return {
        success: false,
        error: `[Database/RLS Error] Gagal memperbarui tabel children: ${updateError.message} (Code: ${updateError.code || "unknown"})`,
      };
    }

    // 2. Sinkronkan relasi orang tua di tabel children_parents
    // Hapus relasi lama terlebih dahulu
    const { error: deleteRelError } = await supabase
      .from("children_parents")
      .delete()
      .eq("child_id", childId);

    if (deleteRelError) {
      console.warn("Gagal memperbarui relasi orang tua (delete step):", deleteRelError.message);
    }

    // Jika orang tua dipilih, masukkan kembali
    if (validated.parent_id && validated.parent_id.trim() !== "") {
      const { error: insertRelError } = await supabase
        .from("children_parents")
        .insert({
          child_id: childId,
          parent_id: validated.parent_id,
          relationship: validated.relationship || "ibu",
        });

      if (insertRelError) {
        return {
          success: true,
          data: updatedChild,
          warning: `Data balita diperbarui, namun relasi orang tua gagal disimpan: ${insertRelError.message}`,
        };
      }
    }

    revalidatePath("/children");
    revalidatePath("/z-score");
    revalidatePath("/analytics");
    revalidatePath("/recipes");

    return {
      success: true,
      data: updatedChild,
      message: `Data balita "${validated.name}" berhasil diperbarui.`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error
          ? `[System Error] ${err.message}`
          : "Terjadi kesalahan internal saat memperbarui data balita",
    };
  }
}

/**
 * Menghapus data balita beserta rekam medis dan relasi orang tua
 */
export async function deleteChild(childId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Silakan login terlebih dahulu" };
    }

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

    if (profile?.role && !["kader", "nutritionist", "admin"].includes(profile.role)) {
      return {
        success: false,
        error: "Akses ditolak: Hanya Kader Posyandu, Ahli Gizi, atau Administrator yang diizinkan menghapus data balita.",
      };
    }

    // 1. Hapus relasi orang tua (children_parents)
    const { error: relError } = await supabase
      .from("children_parents")
      .delete()
      .eq("child_id", childId);

    if (relError) {
      console.warn("Gagal menghapus children_parents (akan coba lanjut jika cascade aktif):", relError.message);
    }

    // 2. Hapus histori pengukuran antropometri (measurements)
    const { error: measError } = await supabase
      .from("measurements")
      .delete()
      .eq("child_id", childId);

    if (measError) {
      console.warn("Gagal menghapus measurements terkait:", measError.message);
    }

    // 3. Hapus record balita di public.children
    const { error: childError } = await supabase
      .from("children")
      .delete()
      .eq("id", childId);

    if (childError) {
      return {
        success: false,
        error: `[Database/RLS Error] Gagal menghapus tabel children: ${childError.message} (Code: ${childError.code || "unknown"})`,
      };
    }

    revalidatePath("/children");
    revalidatePath("/z-score");
    revalidatePath("/analytics");
    revalidatePath("/recipes");

    return {
      success: true,
      message: "Data balita berhasil dihapus dari sistem.",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error
          ? `[System Error] ${err.message}`
          : "Terjadi kesalahan internal saat menghapus data balita",
    };
  }
}
