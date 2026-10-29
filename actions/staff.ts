"use server";

import { createClient } from "@/lib/supabase/server";
import { staffUserSchema, StaffUserFormData, roleRequestSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export interface StaffProfile {
  id: string;
  full_name: string | null;
  role: "admin" | "nutritionist" | "kader" | "parent";
  created_at: string;
}

/**
 * Mendapatkan role pengguna yang sedang login saat ini
 */
export async function getCurrentUserRole(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    return profile?.role || (user.user_metadata?.role as string) || null;
  } catch {
    return null;
  }
}

/**
 * Mengambil daftar staf (kader, nutritionist, admin) - Khusus untuk role Admin
 */
export async function getStaffList(): Promise<{
  data: StaffProfile[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: [], error: "Sesi login tidak valid. Silakan login kembali." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const userRole = profile?.role || (user.user_metadata?.role as string);

    if (userRole !== "admin") {
      return { data: [], error: "Akses ditolak: Hanya Administrator yang berhak mengakses data staf." };
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data as StaffProfile[]) || [] };
  } catch (err: unknown) {
    return {
      data: [],
      error: err instanceof Error ? err.message : "Gagal memuat daftar staf",
    };
  }
}

/**
 * Mengambil daftar orang tua (role 'parent') - Untuk kader & admin saat menghubungkan balita ke akun orang tua
 */
export async function getParentsList(): Promise<{
  data: Array<{ id: string; full_name: string | null; role: string; created_at: string }>;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: [], error: "Sesi login tidak valid. Silakan login kembali." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const userRole = profile?.role || (user.user_metadata?.role as string);

    if (!userRole || !["kader", "nutritionist", "admin"].includes(userRole)) {
      return { data: [], error: "Akses ditolak: Hanya petugas yang berhak melihat daftar orang tua." };
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role, created_at")
      .eq("role", "parent")
      .order("full_name", { ascending: true });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data as Array<{ id: string; full_name: string | null; role: string; created_at: string }>) || [] };
  } catch (err: unknown) {
    return {
      data: [],
      error: err instanceof Error ? err.message : "Gagal memuat daftar orang tua",
    };
  }
}

/**
 * Mendaftarkan akun petugas (Kader Posyandu atau Ahli Gizi) baru oleh Admin
 */
export async function createStaffAccount(data: StaffUserFormData) {
  try {
    const supabase = await createClient();
    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !currentUser) {
      return { success: false, error: "Silakan login sebagai Administrator terlebih dahulu." };
    }

    // Pastikan pemanggil adalah role admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (profileError) {
      console.error("Create staff account authorization error:", profileError);
      return {
        success: false,
        error: "Gagal memverifikasi hak akses administrator.",
      };
    }

    const currentRole = profile?.role;

    if (currentRole !== "admin") {
      return {
        success: false,
        error: "Akses ditolak: Hanya Administrator yang berhak membuat akun petugas posyandu / puskesmas.",
      };
    }

    const validated = staffUserSchema.parse(data);

    // Menggunakan client admin untuk menambahkan user secara definitif
    const adminSupabase = createAdminClient();

    const { data: userData, error: createError } =
      await adminSupabase.auth.admin.createUser({
        email: validated.email,
        password: validated.password,
        email_confirm: true,
        user_metadata: {
          full_name: validated.fullName,
          role: validated.role,
        },
      });

    if (createError) {
      return { success: false, error: createError.message };
    }

    const newUserId = userData.user?.id;
    if (newUserId) {
      // Pastikan record profil terisi sesuai peran yang ditentukan
      const { error: profileError } = await adminSupabase
        .from("profiles")
        .upsert({
          id: newUserId,
          full_name: validated.fullName,
          role: validated.role,
        });

      if (profileError) {
        console.warn("Gagal memperbarui profil pengguna baru:", profileError.message);
      }
    }

    revalidatePath("/admin/users");
    return {
      success: true,
      message: `Akun ${validated.role === "nutritionist" ? "Ahli Gizi" : "Kader Posyandu"} (${validated.email}) berhasil didaftarkan.`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Terjadi kesalahan sistem saat membuat akun staf",
    };
  }
}

export interface RoleRequestItem {
  id: string;
  user_id: string;
  requested_role: "nutritionist" | "kader" | "parent";
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  applicant_name?: string | null;
  current_role?: string | null;
}

/**
 * Mengambil data profil pengguna yang sedang login
 */
export async function getCurrentProfile(): Promise<{
  profile: StaffProfile | null;
  email: string | null;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { profile: null, email: null, error: "Silakan login terlebih dahulu" };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, role, created_at")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return { profile: null, email: user.email || null, error: profileError.message };
    }

    if (!profile) {
      // Fallback profil dari user_metadata jika belum ada record
      return {
        profile: {
          id: user.id,
          full_name: (user.user_metadata?.full_name as string) || null,
          role: ((user.user_metadata?.role as string) as StaffProfile["role"]) || "parent",
          created_at: user.created_at,
        },
        email: user.email || null,
      };
    }

    return { profile: profile as StaffProfile, email: user.email || null };
  } catch (err: unknown) {
    return {
      profile: null,
      email: null,
      error: err instanceof Error ? err.message : "Gagal mengambil data profil",
    };
  }
}

/**
 * Mengubah nama lengkap (full_name) pada public.profiles pengguna yang sedang login
 */
export async function updateProfile(fullName: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Silakan login terlebih dahulu" };
    }

    const cleanName = fullName.trim();
    if (cleanName.length < 2) {
      return { success: false, error: "Nama lengkap minimal 2 karakter" };
    }

    // Update profil di public.profiles
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: cleanName,
      })
      .eq("id", user.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Sinkronkan juga ke user_metadata Supabase Auth
    await supabase.auth.updateUser({
      data: { full_name: cleanName },
    });

    revalidatePath("/", "layout");
    return { success: true, message: "Nama profil berhasil diperbarui" };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Terjadi kesalahan saat memperbarui profil",
    };
  }
}

/**
 * Mengajukan permohonan perubahan peran (role request)
 */
export async function submitRoleRequest(data: {
  requestedRole: "nutritionist" | "kader" | "parent";
  reason: string;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Silakan login terlebih dahulu" };
    }

    // Validasi input menggunakan roleRequestSchema
    const parseResult = roleRequestSchema.safeParse(data);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      return {
        success: false,
        error: firstIssue?.message || "Alasan permohonan tidak valid (minimal 10 karakter).",
      };
    }

    const validData = parseResult.data;

    // Pastikan user profil ada
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const currentRole = profile?.role || (user.user_metadata?.role as string);

    if (currentRole === validData.requestedRole) {
      return {
        success: false,
        error: "Anda sudah memiliki peran ini saat ini.",
      };
    }

    // Insert ke tabel public.role_requests
    const { data: inserted, error: insertError } = await supabase
      .from("role_requests")
      .insert({
        user_id: user.id,
        requested_role: validData.requestedRole,
        reason: validData.reason.trim(),
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.message.includes("unique") || insertError.code === "23505") {
        return {
          success: false,
          error: "Anda masih memiliki permohonan yang berstatus pending. Harap tunggu verifikasi admin.",
        };
      }
      return { success: false, error: insertError.message };
    }

    revalidatePath("/settings/account");
    revalidatePath("/admin/users");
    return {
      success: true,
      data: inserted as RoleRequestItem,
      message: "Permohonan perubahan peran berhasil diajukan dan sedang menunggu verifikasi Administrator.",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal mengajukan perubahan peran",
    };
  }
}

/**
 * Mengambil riwayat permohonan peran milik user yang sedang login
 */
export async function getMyRoleRequests(): Promise<{
  data: RoleRequestItem[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: [], error: "Silakan login terlebih dahulu" };
    }

    const { data, error } = await supabase
      .from("role_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data as RoleRequestItem[]) || [] };
  } catch (err: unknown) {
    return {
      data: [],
      error: err instanceof Error ? err.message : "Gagal mengambil daftar permohonan",
    };
  }
}

/**
 * Membatalkan permohonan peran yang berstatus pending milik user sendiri
 */
export async function cancelRoleRequest(requestId: string): Promise<{
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
      return { success: false, error: "Silakan login terlebih dahulu." };
    }

    // Pastikan permohonan milik user sendiri dan masih berstatus pending
    const { data: request, error: fetchError } = await supabase
      .from("role_requests")
      .select("id, user_id, status")
      .eq("id", requestId)
      .maybeSingle();

    if (fetchError) {
      return {
        success: false,
        error: `[RLS / Database Error] Gagal memeriksa permohonan: ${fetchError.message} (Code: ${fetchError.code || "unknown"})`,
      };
    }

    if (!request) {
      return { success: false, error: "Permohonan tidak ditemukan." };
    }

    if (request.user_id !== user.id) {
      return {
        success: false,
        error: "Akses ditolak: Anda hanya dapat membatalkan permohonan peran milik Anda sendiri.",
      };
    }

    if (request.status !== "pending") {
      return {
        success: false,
        error: `Permohonan sudah berstatus "${request.status}" dan tidak dapat dibatalkan lagi.`,
      };
    }

    // Hapus baris role_requests
    const { error: deleteError } = await supabase
      .from("role_requests")
      .delete()
      .eq("id", requestId)
      .eq("user_id", user.id);

    if (deleteError) {
      return {
        success: false,
        error: `[Database/RLS Error] Gagal membatalkan permohonan: ${deleteError.message} (Code: ${deleteError.code || "unknown"})`,
      };
    }

    revalidatePath("/settings/account");
    revalidatePath("/admin/users");

    return {
      success: true,
      message: "Permohonan perubahan peran berhasil dibatalkan dan dihapus dari antrean.",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error
          ? `[System Error] ${err.message}`
          : "Terjadi kesalahan internal saat membatalkan permohonan",
    };
  }
}

/**
 * Mengambil seluruh daftar permohonan perubahan peran (Khusus Admin)
 */
export async function getAllRoleRequests(): Promise<{
  data: RoleRequestItem[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: [], error: "Silakan login sebagai Administrator" };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      return { data: [], error: "Akses ditolak: Hanya Administrator yang dapat melihat permohonan peran." };
    }

    // Ambil permohonan dan gabungkan informasi profil pemohon
    const { data: requests, error: reqError } = await supabase
      .from("role_requests")
      .select("id, user_id, requested_role, reason, status, created_at, reviewed_at, reviewed_by")
      .order("created_at", { ascending: false });

    if (reqError) {
      return { data: [], error: reqError.message };
    }

    if (!requests || requests.length === 0) {
      return { data: [] };
    }

    // Ambil semua profil terkait
    const userIds = Array.from(new Set(requests.map((r) => r.user_id)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("id", userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    const enriched: RoleRequestItem[] = requests.map((r) => {
      const p = profileMap.get(r.user_id);
      return {
        ...r,
        applicant_name: p?.full_name || "Tanpa Nama",
        current_role: p?.role || "parent",
      };
    });

    return { data: enriched };
  } catch (err: unknown) {
    return {
      data: [],
      error: err instanceof Error ? err.message : "Gagal mengambil permohonan peran",
    };
  }
}

/**
 * Memproses verifikasi permohonan peran oleh Admin melalui RPC review_role_request
 */
export async function processRoleRequestDecision(
  requestId: string,
  decision: "approved" | "rejected",
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Silakan login sebagai Administrator" };
    }

    const { error: rpcError } = await supabase.rpc("review_role_request", {
      p_request_id: requestId,
      p_decision: decision,
    });

    if (rpcError) {
      return { success: false, error: rpcError.message };
    }

    revalidatePath("/admin/users");
    revalidatePath("/settings/account");
    revalidatePath("/", "layout");

    return {
      success: true,
      message: `Permohonan berhasil ${decision === "approved" ? "disetujui" : "ditolak"}.`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memproses permohonan",
    };
  }
}

/**
 * Memperbarui data pengguna (nama dan peran) oleh Administrator.
 * Jika pengguna memiliki permohonan peran yang berstatus pending:
 * - Jika peran baru SAMA dengan peran yang dimohon: permohonan otomatis disetujui (approved).
 * - Jika peran baru BERBEDA dengan peran yang dimohon: permohonan TETAP pending.
 */
export async function updateUserByAdmin(
  userId: string,
  data: {
    fullName: string;
    role: "admin" | "nutritionist" | "kader" | "parent";
  },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !currentUser) {
      return { success: false, error: "Silakan login sebagai Administrator terlebih dahulu." };
    }

    // Verifikasi pemanggil adalah admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (profileError || profile?.role !== "admin") {
      return {
        success: false,
        error: profileError
          ? `RLS / Error Verifikasi Profil Admin: ${profileError.message}`
          : "Akses ditolak: Hanya Administrator yang berhak mengubah data pengguna.",
      };
    }

    const cleanName = data.fullName.trim();
    if (cleanName.length < 2) {
      return { success: false, error: "Nama lengkap minimal 2 karakter." };
    }

    // Gunakan admin client untuk update auth dan database profiles
    const adminSupabase = createAdminClient();

    // 1. Update public.profiles
    const { error: updateProfileError } = await adminSupabase
      .from("profiles")
      .update({
        full_name: cleanName,
        role: data.role,
      })
      .eq("id", userId);

    if (updateProfileError) {
      return {
        success: false,
        error: `[Database/RLS Error] Gagal memperbarui public.profiles: ${updateProfileError.message} (Code: ${updateProfileError.code || "unknown"})`,
      };
    }

    // 2. Update user metadata di Supabase Auth
    try {
      await adminSupabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          full_name: cleanName,
          role: data.role,
        },
      });
    } catch (authErr) {
      console.warn("Gagal memperbarui user_metadata auth:", authErr);
    }

    // 3. Sinkronisasi permohonan peran (role_requests) jika ada yang masih pending
    const { data: pendingRequests, error: reqFetchError } = await adminSupabase
      .from("role_requests")
      .select("id, requested_role")
      .eq("user_id", userId)
      .eq("status", "pending");

    if (reqFetchError) {
      console.warn("Gagal memeriksa role_requests pengguna:", reqFetchError.message);
    } else if (pendingRequests && pendingRequests.length > 0) {
      for (const req of pendingRequests) {
        if (req.requested_role === data.role) {
          // Role yang diubah admin SAMA dengan request -> tandai approved
          const { error: approveError } = await adminSupabase
            .from("role_requests")
            .update({
              status: "approved",
              reviewed_at: new Date().toISOString(),
              reviewed_by: currentUser.id,
            })
            .eq("id", req.id);

          if (approveError) {
            console.warn("Gagal otomatis menyetujui permohonan peran:", approveError.message);
          }
        }
        // Jika beda (data.role !== req.requested_role), biarkan tetap pending
      }
    }

    revalidatePath("/admin/users");
    revalidatePath("/children");
    revalidatePath("/", "layout");

    return {
      success: true,
      message: `Data pengguna "${cleanName}" berhasil diperbarui.`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error
          ? `[System Error] ${err.message}`
          : "Terjadi kesalahan internal saat memperbarui pengguna",
    };
  }
}

/**
 * Menghapus pengguna dari sistem oleh Administrator.
 */
export async function deleteUserByAdmin(userId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !currentUser) {
      return { success: false, error: "Silakan login sebagai Administrator terlebih dahulu." };
    }

    if (currentUser.id === userId) {
      return {
        success: false,
        error: "Operasi tidak diizinkan: Anda tidak dapat menghapus akun administrator Anda sendiri.",
      };
    }

    // Verifikasi pemanggil adalah admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (profileError || profile?.role !== "admin") {
      return {
        success: false,
        error: profileError
          ? `RLS / Error Verifikasi Profil Admin: ${profileError.message}`
          : "Akses ditolak: Hanya Administrator yang berhak menghapus pengguna.",
      };
    }

    const adminSupabase = createAdminClient();

    // 1. Hapus referensi di tabel terkait (role_requests, children_parents)
    const { error: delReqError } = await adminSupabase
      .from("role_requests")
      .delete()
      .eq("user_id", userId);

    if (delReqError) {
      console.warn("Gagal membersihkan role_requests:", delReqError.message);
    }

    const { error: delParentRelError } = await adminSupabase
      .from("children_parents")
      .delete()
      .eq("parent_id", userId);

    if (delParentRelError) {
      console.warn("Gagal membersihkan children_parents:", delParentRelError.message);
    }

    // 2. Hapus profile dari public.profiles
    const { error: delProfileError } = await adminSupabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (delProfileError) {
      return {
        success: false,
        error: `[Database/RLS Error] Gagal menghapus profil dari public.profiles: ${delProfileError.message} (Code: ${delProfileError.code || "unknown"})`,
      };
    }

    // 3. Hapus user dari auth.users
    const { error: delAuthError } = await adminSupabase.auth.admin.deleteUser(userId);
    if (delAuthError) {
      return {
        success: false,
        error: `[Auth Admin Error] Profil terhapus, namun gagal menghapus akun auth: ${delAuthError.message}`,
      };
    }

    revalidatePath("/admin/users");
    revalidatePath("/children");
    revalidatePath("/", "layout");

    return {
      success: true,
      message: "Akun pengguna berhasil dihapus dari sistem.",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error
          ? `[System Error] ${err.message}`
          : "Terjadi kesalahan internal saat menghapus pengguna",
    };
  }
}

