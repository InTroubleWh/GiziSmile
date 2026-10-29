"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  profileSchema,
  ProfileFormData,
  roleRequestSchema,
  RoleRequestFormData,
} from "@/lib/validators";
import {
  updateProfile,
  submitRoleRequest,
  cancelRoleRequest,
  StaffProfile,
  RoleRequestItem,
} from "@/actions/staff";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  User,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  HeartHandshake,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Clock,
  Check,
  XCircle,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";

interface AccountSettingsClientProps {
  initialProfile: StaffProfile | null;
  initialEmail: string | null;
  initialRequests: RoleRequestItem[];
}

export function AccountSettingsClient({
  initialProfile,
  initialEmail,
  initialRequests,
}: AccountSettingsClientProps) {
  const [profile, setProfile] = useState<StaffProfile | null>(initialProfile);
  const [roleRequests, setRoleRequests] = useState<RoleRequestItem[]>(initialRequests);
  const [profileFeedback, setProfileFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [requestFeedback, setRequestFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [isPendingProfile, startTransitionProfile] = useTransition();
  const [isPendingRequest, startTransitionRequest] = useTransition();

  // State untuk aksi pembatalan permohonan
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [cancelFeedback, setCancelFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Form untuk Ubah Nama Lengkap (Profile)
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile?.full_name || "",
    },
  });

  // Form untuk Pengajuan Perubahan Role
  const {
    register: registerRequest,
    handleSubmit: handleSubmitRequest,
    reset: resetRequest,
    formState: { errors: requestErrors },
  } = useForm<RoleRequestFormData>({
    resolver: zodResolver(roleRequestSchema),
    defaultValues: {
      requestedRole: profile?.role === "kader" ? "nutritionist" : "kader",
      reason: "",
    },
  });

  const onUpdateProfile = (data: ProfileFormData) => {
    setProfileFeedback(null);
    startTransitionProfile(async () => {
      const res = await updateProfile(data.fullName);
      if (res.success) {
        setProfileFeedback({ type: "success", message: res.message || "Nama profil berhasil diperbarui" });
        setProfile((prev) => (prev ? { ...prev, full_name: data.fullName } : null));
      } else {
        setProfileFeedback({ type: "error", message: res.error || "Gagal memperbarui profil" });
      }
    });
  };

  const onSubmitRoleRequest = (data: RoleRequestFormData) => {
    setRequestFeedback(null);
    startTransitionRequest(async () => {
      const res = await submitRoleRequest(data);
      if (res.success) {
        setRequestFeedback({
          type: "success",
          message: res.message || "Permohonan berhasil diajukan!",
        });
        const newEntry: RoleRequestItem = res.data || {
          id: crypto.randomUUID(),
          user_id: profile?.id || "",
          requested_role: data.requestedRole,
          reason: data.reason,
          status: "pending",
          created_at: new Date().toISOString(),
          reviewed_at: null,
          reviewed_by: null,
        };
        setRoleRequests((prev) => [newEntry, ...prev]);
        resetRequest();
      } else {
        setRequestFeedback({
          type: "error",
          message: res.error || "Gagal mengajukan perubahan peran",
        });
      }
    });
  };

  const handleCancelRequest = async (requestId: string) => {
    setCancelFeedback(null);
    setCancelingId(requestId);
    try {
      const res = await cancelRoleRequest(requestId);
      if (res.success) {
        setRoleRequests((prev) => prev.filter((r) => r.id !== requestId));
        setCancelFeedback({
          type: "success",
          message: res.message || "Permohonan berhasil dibatalkan.",
        });
      } else {
        setCancelFeedback({
          type: "error",
          message: res.error || "Gagal membatalkan permohonan.",
        });
      }
    } catch (err: unknown) {
      setCancelFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Terjadi kesalahan internal",
      });
    } finally {
      setCancelingId(null);
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
            <HeartHandshake className="w-3 h-3" /> Orang Tua Balita
          </Badge>
        );
      default:
        return <Badge variant="secondary">Pengguna</Badge>;
    }
  };

  const getStatusBadge = (status: RoleRequestItem["status"]) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 text-[11px]">
            <Clock className="w-3 h-3" /> Menunggu Persetujuan
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 text-[11px]">
            <Check className="w-3 h-3" /> Disetujui
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1 text-[11px]">
            <XCircle className="w-3 h-3" /> Ditolak
          </Badge>
        );
    }
  };

  const hasPendingRequest = roleRequests.some((r) => r.status === "pending");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Kolom Kiri: Profil Pengguna & Edit Nama */}
      <div className="space-y-6 lg:col-span-1">
        <Card className="shadow-sm border">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Profil Akun Anda
            </CardTitle>
            <CardDescription className="text-xs">
              Informasi identitas Anda yang terhubung dengan pencatatan GiziSmile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-muted/30 rounded-lg space-y-2 border text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Peran Saat Ini:</span>
                <div>{getRoleBadge(profile?.role)}</div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-mono text-foreground text-[11px] truncate max-w-[160px]">
                  {initialEmail || "Tidak ada email"}
                </span>
              </div>
            </div>

            {profileFeedback && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-start gap-2 border ${profileFeedback.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                    : "bg-destructive/10 border-destructive/30 text-destructive"
                  }`}
              >
                {profileFeedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>{profileFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSubmitProfile(onUpdateProfile)} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-xs font-semibold">
                  Nama Lengkap (Tampilan)
                </Label>
                <div className="relative">
                  <User className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                  <Input
                    id="fullName"
                    placeholder="Nama Lengkap & Gelar Anda"
                    className="pl-9 text-xs"
                    {...registerProfile("fullName")}
                  />
                </div>
                {profileErrors.fullName && (
                  <p className="text-[11px] text-destructive">{profileErrors.fullName.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isPendingProfile}
                size="sm"
                className="w-full text-xs font-semibold"
              >
                {isPendingProfile ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Menyimpan Nama...
                  </>
                ) : (
                  "Simpan Perubahan Nama"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Kolom Kanan: Pengajuan Perubahan Role & Riwayat */}
      <div className="space-y-6 lg:col-span-2">
        {/* Form Pengajuan Role */}
        <Card className="shadow-sm border">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-primary" />
              Pengajuan Perubahan Peran (Role Request)
            </CardTitle>
            <CardDescription className="text-xs">
              Ajukan permohonan ke Administrator jika Anda ditugaskan sebagai Kader Posyandu atau Ahli Gizi Puskesmas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasPendingRequest && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Permohonan Anda Sedang Ditinjau:</span> Anda masih memiliki 1 permohonan yang berstatus pending. Harap tunggu verifikasi dari Administrator.
                </div>
              </div>
            )}

            {requestFeedback && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-start gap-2 border ${requestFeedback.type === "success"
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

            <form onSubmit={handleSubmitRequest(onSubmitRoleRequest)} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="requestedRole" className="text-xs font-semibold">
                  Pilih Peran yang Dimohonkan
                </Label>
                <select
                  id="requestedRole"
                  disabled={hasPendingRequest || isPendingRequest}
                  {...registerRequest("requestedRole")}
                  className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  <option value="kader">Kader Posyandu (Pencatatan antropometri balita &amp; Z-Score)</option>
                  <option value="nutritionist">Ahli Gizi Puskesmas (Analitik stunting wilayah &amp; resep)</option>
                  <option value="parent">Orang Tua (Akses pantau grafik tumbuh kembang anak)</option>
                </select>
                {requestErrors.requestedRole && (
                  <p className="text-[11px] text-destructive">{requestErrors.requestedRole.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="reason" className="text-xs font-semibold">
                    Alasan Permohonan / Instansi Binaan
                  </Label>
                  <span className="text-[10px] text-muted-foreground">Minimal 10 karakter</span>
                </div>
                <textarea
                  id="reason"
                  rows={3}
                  disabled={hasPendingRequest || isPendingRequest}
                  placeholder="Contoh: Ditugaskan sebagai Tenaga Pelaksana Gizi (TPG) Puskesmas Melati mulai Oktober 2026."
                  className={`w-full text-xs rounded-md border bg-background p-3 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 ${requestErrors.reason
                      ? "border-destructive focus-visible:ring-destructive"
                      : "border-input focus-visible:ring-ring"
                    }`}
                  {...registerRequest("reason")}
                />
                {requestErrors.reason ? (
                  <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {requestErrors.reason.message}
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Jelaskan instansi bertugas, posyandu binaan, atau keperluan penyesuaian peran Anda.
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={hasPendingRequest || isPendingRequest}
                size="sm"
                className="gap-1.5 text-xs font-semibold"
              >
                {isPendingRequest ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    Mengirim Permohonan...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 mr-1" />
                    Kirim Permohonan Peran
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Riwayat Permohonan */}
        <Card className="shadow-sm border">
          <CardHeader className="space-y-1 pb-3">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span>Riwayat Pengajuan Peran Anda</span>
              <Badge variant="outline" className="text-xs">
                {roleRequests.length} Pengajuan
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Banner Feedback Pembatalan Permohonan */}
            {cancelFeedback && (
              <div
                className={`p-3 rounded-lg text-xs flex items-start justify-between border ${cancelFeedback.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                    : "bg-destructive/10 border-destructive/30 text-destructive"
                  }`}
              >
                <div className="flex items-start gap-2">
                  {cancelFeedback.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-semibold block">
                      {cancelFeedback.type === "success" ? "Berhasil:" : "Gagal Membatalkan:"}
                    </span>
                    <span className="font-mono text-[11px] break-all">{cancelFeedback.message}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCancelFeedback(null)}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {roleRequests.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground border rounded-lg bg-muted/20">
                Anda belum pernah mengajukan permohonan perubahan peran.
              </div>
            ) : (
              <div className="divide-y border rounded-lg overflow-hidden bg-card text-xs">
                {roleRequests.map((req) => {
                  const isCanceling = cancelingId === req.id;

                  return (
                    <div key={req.id} className="p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">Permohonan Menjadi:</span>
                          {getRoleBadge(req.requested_role)}
                        </div>
                        <div className="flex items-center gap-2">
                          <div>{getStatusBadge(req.status)}</div>
                          {req.status === "pending" && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isCanceling}
                              onClick={() => handleCancelRequest(req.id)}
                              className="h-6 text-[11px] px-2 text-destructive border-destructive/30 hover:bg-destructive/10 gap-1"
                              title="Batalkan permohonan ini"
                            >
                              {isCanceling ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                              <span>Batalkan</span>
                            </Button>
                          )}
                        </div>
                      </div>
                      {req.reason && (
                        <p className="text-muted-foreground text-[11px] bg-muted/30 p-2 rounded border">
                          &quot;{req.reason}&quot;
                        </p>
                      )}
                      <div className="text-[10px] text-muted-foreground flex items-center gap-3">
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
                        {req.reviewed_at && (
                          <span>
                            Ditinjau:{" "}
                            {new Date(req.reviewed_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
