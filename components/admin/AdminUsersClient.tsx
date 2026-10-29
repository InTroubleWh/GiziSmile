"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { staffUserSchema, StaffUserFormData } from "@/lib/validators";
import {
  createStaffAccount,
  processRoleRequestDecision,
  updateUserByAdmin,
  deleteUserByAdmin,
  StaffProfile,
  RoleRequestItem,
} from "@/actions/staff";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  HeartHandshake,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  User,
  Users,
  Check,
  X,
  ShieldAlert,
  Pencil,
  Trash2,
} from "lucide-react";

interface AdminUsersClientProps {
  initialStaffList: StaffProfile[];
  initialRoleRequests: RoleRequestItem[];
  currentUserId?: string;
}

export function AdminUsersClient({
  initialStaffList,
  initialRoleRequests,
  currentUserId,
}: AdminUsersClientProps) {
  const [staffList, setStaffList] = useState<StaffProfile[]>(initialStaffList);
  const [roleRequests, setRoleRequests] = useState<RoleRequestItem[]>(initialRoleRequests);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [requestFeedback, setRequestFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // State untuk Edit User Modal / Dialog
  const [editingStaff, setEditingStaff] = useState<StaffProfile | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "nutritionist" | "kader" | "parent">("kader");
  const [editError, setEditError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // State untuk Delete User Modal / Confirmation
  const [deletingStaff, setDeletingStaff] = useState<StaffProfile | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // State error umum untuk tabel staf (terlihat tepat di atas tabel)
  const [staffTableError, setStaffTableError] = useState<string | null>(null);
  const [staffTableSuccess, setStaffTableSuccess] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StaffUserFormData>({
    resolver: zodResolver(staffUserSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      role: "kader",
    },
  });

  const onSubmit = (formData: StaffUserFormData) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await createStaffAccount(formData);
      if (res.success) {
        setFeedback({
          type: "success",
          message: res.message || "Akun petugas berhasil dibuat!",
        });
        setStaffList((prev) => [
          {
            id: `temp-${Date.now()}`,
            full_name: formData.fullName,
            role: formData.role,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
        reset();
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Gagal membuat akun petugas",
        });
      }
    });
  };

  const handleDecision = async (requestId: string, decision: "approved" | "rejected") => {
    setRequestFeedback(null);
    setProcessingId(requestId);
    try {
      const res = await processRoleRequestDecision(requestId, decision);
      if (res.success) {
        setRequestFeedback({
          type: "success",
          message: res.message || "Keputusan berhasil disimpan.",
        });
        // Update permohonan di state lokal
        const targetReq = roleRequests.find((r) => r.id === requestId);
        setRoleRequests((prev) =>
          prev.map((r) =>
            r.id === requestId
              ? { ...r, status: decision, reviewed_at: new Date().toISOString() }
              : r,
          ),
        );
        // Jika approved, update juga role di staffList jika user ada di daftar
        if (decision === "approved" && targetReq) {
          setStaffList((prev) =>
            prev.map((s) =>
              s.id === targetReq.user_id ? { ...s, role: targetReq.requested_role } : s,
            ),
          );
        }
      } else {
        setRequestFeedback({
          type: "error",
          message: res.error || "Gagal memproses permohonan.",
        });
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenEdit = (staff: StaffProfile) => {
    setEditError(null);
    setStaffTableError(null);
    setStaffTableSuccess(null);
    setEditingStaff(staff);
    setEditFullName(staff.full_name || "");
    setEditRole(staff.role);
  };

  const handleSaveEdit = async () => {
    if (!editingStaff) return;
    setEditError(null);
    setIsUpdating(true);
    try {
      const res = await updateUserByAdmin(editingStaff.id, {
        fullName: editFullName,
        role: editRole,
      });

      if (res.success) {
        // Update staff list state
        setStaffList((prev) =>
          prev.map((s) =>
            s.id === editingStaff.id
              ? { ...s, full_name: editFullName.trim(), role: editRole }
              : s,
          ),
        );
        // Sinkronkan roleRequests jika role yang diubah cocok dengan request pending
        setRoleRequests((prev) =>
          prev.map((r) =>
            r.user_id === editingStaff.id && r.status === "pending" && r.requested_role === editRole
              ? { ...r, status: "approved", reviewed_at: new Date().toISOString() }
              : r,
          ),
        );
        setStaffTableSuccess(res.message || "Data pengguna berhasil diperbarui!");
        setEditingStaff(null);
      } else {
        setEditError(res.error || "Gagal memperbarui data pengguna");
      }
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Terjadi kesalahan sistem");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenDelete = (staff: StaffProfile) => {
    setDeleteError(null);
    setStaffTableError(null);
    setStaffTableSuccess(null);
    setDeletingStaff(staff);
  };

  const handleDeleteUser = async () => {
    if (!deletingStaff) return;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      const res = await deleteUserByAdmin(deletingStaff.id);
      if (res.success) {
        setStaffList((prev) => prev.filter((s) => s.id !== deletingStaff.id));
        setRoleRequests((prev) => prev.filter((r) => r.user_id !== deletingStaff.id));
        setStaffTableSuccess(res.message || "Pengguna berhasil dihapus.");
        setDeletingStaff(null);
      } else {
        setDeleteError(res.error || "Gagal menghapus pengguna");
      }
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Terjadi kesalahan sistem");
    } finally {
      setIsDeleting(false);
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "admin":
        return (
          <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 font-semibold gap-1">
            <ShieldCheck className="w-3 h-3" /> Administrator
          </Badge>
        );
      case "nutritionist":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 font-semibold gap-1">
            <Stethoscope className="w-3 h-3" /> Ahli Gizi Puskesmas
          </Badge>
        );
      case "kader":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold gap-1">
            <UserCheck className="w-3 h-3" /> Kader Posyandu
          </Badge>
        );
      case "parent":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold gap-1">
            <HeartHandshake className="w-3 h-3" /> Orang Tua
          </Badge>
        );
      default:
        return <Badge variant="secondary">Pengguna</Badge>;
    }
  };

  const pendingRequests = roleRequests.filter((r) => r.status === "pending");

  return (
    <div className="space-y-8">
      {/* Bagian 1: Permohonan Perubahan Peran (Role Requests Table) */}
      <Card className="shadow-sm border">
        <CardHeader className="space-y-1 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              Permohonan Perubahan Peran Pengguna
            </CardTitle>
            <div className="flex items-center gap-2">
              {pendingRequests.length > 0 && (
                <Badge variant="outline" className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30 font-semibold">
                  {pendingRequests.length} Perlu Verifikasi
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                Total: {roleRequests.length}
              </Badge>
            </div>
          </div>
          <CardDescription className="text-xs">
            Daftar pengajuan hak akses dari staf atau pengguna lapangan untuk diverifikasi atau ditolak.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {requestFeedback && (
            <div
              className={`p-3 rounded-lg text-xs flex items-start gap-2 border ${requestFeedback.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                : "bg-destructive/10 border-destructive/30 text-destructive"
                }`}
            >
              {requestFeedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{requestFeedback.message}</span>
            </div>
          )}

          {roleRequests.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground border rounded-lg bg-muted/20">
              Belum ada permohonan perubahan peran yang masuk.
            </div>
          ) : (
            <div className="divide-y border rounded-lg overflow-hidden bg-card text-xs">
              {roleRequests.map((req) => {
                const isProcessing = processingId === req.id;
                return (
                  <div
                    key={req.id}
                    className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${req.status === "pending" ? "bg-amber-500/[0.03]" : "hover:bg-muted/20"
                      }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">
                          {req.applicant_name || "Pengguna"}
                        </span>
                        <span className="text-muted-foreground text-xs">memohon menjadi</span>
                        {getRoleBadge(req.requested_role)}
                      </div>

                      {req.reason && (
                        <p className="text-muted-foreground text-xs bg-muted/40 p-2 rounded border leading-relaxed">
                          &quot;{req.reason}&quot;
                        </p>
                      )}

                      <div className="text-[11px] text-muted-foreground flex items-center gap-3 flex-wrap">
                        <span>Peran Saat Ini: {getRoleBadge(req.current_role || undefined)}</span>
                        <span>•</span>
                        <span>
                          Diajukan:{" "}
                          {new Date(req.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Aksi Verifikasi atau Status */}
                    <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                      {req.status === "pending" ? (
                        <>
                          <Button
                            size="sm"
                            disabled={isProcessing}
                            onClick={() => handleDecision(req.id, "approved")}
                            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          >
                            {isProcessing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            Setujui
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isProcessing}
                            onClick={() => handleDecision(req.id, "rejected")}
                            className="h-8 text-xs text-destructive hover:bg-destructive/10 border-destructive/30 gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            Tolak
                          </Button>
                        </>
                      ) : req.status === "approved" ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 text-xs">
                          <Check className="w-3 h-3" /> Disetujui
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1 text-xs">
                          <X className="w-3 h-3" /> Ditolak
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bagian 2: Registrasi Petugas Baru & Daftar Staf Terdaftar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Registrasi Petugas Baru */}
        <Card className="lg:col-span-1 shadow-sm border">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-rose-600" />
              Tambah Petugas Baru
            </CardTitle>
            <CardDescription className="text-xs">
              Daftarkan akun staf resmi untuk Kader Posyandu atau Tenaga Pelaksana Gizi (TPG).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {feedback && (
              <div
                className={`mb-4 p-3 rounded-lg text-xs flex items-start gap-2 border ${feedback.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                  : "bg-destructive/10 border-destructive/30 text-destructive"
                  }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-xs font-semibold">
                  Nama Lengkap &amp; Gelar
                </Label>
                <div className="relative">
                  <User className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                  <Input
                    id="fullName"
                    placeholder="Contoh: Bidan Siti Rahmawati, A.Md.Keb"
                    className="pl-9 text-xs"
                    {...register("fullName")}
                  />
                </div>
                {errors.fullName && (
                  <p className="text-[11px] text-destructive">{errors.fullName.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold">
                  Alamat Email Kedinasan / Akun
                </Label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="petugas@gizismile.id"
                    className="pl-9 text-xs"
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-[11px] text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold">
                  Kata Sandi Awal
                </Label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimal 6 karakter"
                    className="pl-9 text-xs"
                    {...register("password")}
                  />
                </div>
                {errors.password && (
                  <p className="text-[11px] text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role" className="text-xs font-semibold">
                  Peran &amp; Hak Akses Aplikasi
                </Label>
                <select
                  id="role"
                  {...register("role")}
                  className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="kader">Kader Posyandu (Input Pengukuran, Rekam Balita)</option>
                  <option value="nutritionist">Ahli Gizi Puskesmas (Analitik Wilayah, Intervensi Resep)</option>
                </select>
                {errors.role && (
                  <p className="text-[11px] text-destructive">{errors.role.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs mt-2"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Mendaftarkan Petugas...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Daftarkan Akun Petugas
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Tabel Staf Terdaftar */}
        <Card className="lg:col-span-2 shadow-sm border">
          <CardHeader className="space-y-1 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Daftar Petugas &amp; Staf Terdaftar
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {staffList.length} Petugas
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Daftar seluruh akun yang memiliki hak input dan pengelolaan program stunting di GiziSmile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Notifikasi feedback aksi tabel staf */}
            {staffTableSuccess && (
              <div className="p-3 rounded-lg text-xs flex items-center justify-between border bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{staffTableSuccess}</span>
                </div>
                <button
                  onClick={() => setStaffTableSuccess(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {staffTableError && (
              <div className="p-3 rounded-lg text-xs flex items-start justify-between border bg-destructive/10 border-destructive/30 text-destructive">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Gagal Melakukan Aksi:</span>
                    <span className="font-mono text-[11px] break-all">{staffTableError}</span>
                  </div>
                </div>
                <button
                  onClick={() => setStaffTableError(null)}
                  className="text-destructive/80 hover:text-destructive"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {staffList.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground border rounded-lg bg-muted/20">
                Belum ada staf terdaftar di database. Gunakan formulir di sebelah kiri untuk menambahkan.
              </div>
            ) : (
              <div className="divide-y border rounded-lg overflow-hidden bg-card">
                {staffList.map((staff) => {
                  const isCurrentLoggedAdmin = currentUserId && staff.id === currentUserId;

                  return (
                    <div
                      key={staff.id}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="font-semibold text-xs text-foreground flex items-center gap-2 flex-wrap">
                          <span>{staff.full_name || "Petugas Lapangan"}</span>
                          {getRoleBadge(staff.role)}
                          {isCurrentLoggedAdmin && (
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal">
                              Anda (Sesi Saat Ini)
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground truncate">
                          ID: {staff.id}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        <div className="text-[11px] text-muted-foreground whitespace-nowrap mr-2 hidden md:block">
                          {new Date(staff.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>

                        {/* Tombol Edit Pengguna */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(staff)}
                          className="h-7 text-xs px-2.5 gap-1 border-muted-foreground/30 hover:bg-primary/10 hover:text-primary"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Edit</span>
                        </Button>

                        {/* Tombol Hapus Pengguna */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={Boolean(isCurrentLoggedAdmin)}
                          title={
                            isCurrentLoggedAdmin
                              ? "Anda tidak dapat menghapus akun Anda sendiri"
                              : "Hapus akun pengguna"
                          }
                          onClick={() => handleOpenDelete(staff)}
                          className="h-7 text-xs px-2.5 gap-1 text-destructive hover:bg-destructive/10 border-destructive/30"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Hapus</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal / Dialog Edit Pengguna */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-card border rounded-xl shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm text-foreground">Edit Data &amp; Peran Pengguna</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error banner dialog edit */}
            {editError && (
              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold block">Gagal Memperbarui Pengguna:</span>
                  <span className="font-mono text-[11px] break-all">{editError}</span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name" className="text-xs font-semibold">
                  Nama Lengkap
                </Label>
                <Input
                  id="edit-name"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="h-8 text-xs"
                  placeholder="Nama Lengkap Petugas"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-role" className="text-xs font-semibold">
                  Peran (Role) Akses Sistem
                </Label>
                <select
                  id="edit-role"
                  value={editRole}
                  onChange={(e) =>
                    setEditRole(e.target.value as "admin" | "nutritionist" | "kader" | "parent")
                  }
                  className="w-full h-8 px-2.5 rounded-md border bg-background text-foreground text-xs"
                >
                  <option value="kader">Kader Posyandu (Input Pengukuran, Data Balita)</option>
                  <option value="nutritionist">Ahli Gizi Puskesmas (Analitik &amp; Intervensi Resep)</option>
                  <option value="admin">Administrator (Akses Penuh Sistem)</option>
                  <option value="parent">Orang Tua (Hanya Balita Terkait)</option>
                </select>
                <p className="text-[10px] text-muted-foreground">
                  Catatan: Jika pengguna memiliki permohonan peran aktif, permohonan akan otomatis disetujui jika peran baru cocok.
                  Jika peran berbeda, permohonan tetap pending untuk verifikasi khusus.
                </p>
              </div>

              <div className="text-[11px] text-muted-foreground font-mono bg-muted/30 p-2 rounded border">
                User ID: {editingStaff.id}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setEditingStaff(null)}
                disabled={isUpdating}
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground"
                onClick={handleSaveEdit}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Simpan Perubahan
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Dialog Konfirmasi Hapus Pengguna */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-card border border-destructive/30 rounded-xl shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center gap-2 text-destructive border-b pb-2">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-sm">Konfirmasi Hapus Pengguna</h3>
            </div>

            {/* Error banner dialog delete */}
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
              Apakah Anda yakin ingin menghapus akun{" "}
              <strong className="text-foreground">{deletingStaff.full_name || "Petugas"}</strong>?
              Tindakan ini akan menghapus akun autentikasi dan profil pengguna secara permanen.
            </p>

            <div className="text-[11px] font-mono text-muted-foreground bg-muted/40 p-2 rounded border">
              ID: {deletingStaff.id}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setDeletingStaff(null)}
                disabled={isDeleting}
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="h-8 text-xs gap-1.5"
                onClick={handleDeleteUser}
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
                    Hapus Pengguna
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
