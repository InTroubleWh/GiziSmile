"use client";

import { useState, useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { childSchema, ChildFormData } from "@/lib/validators";
import {
  createChild,
  updateChild,
  deleteChild,
  ChildWithLatestMeasurement,
} from "@/actions/children";
import { StatusBadge } from "@/components/z-score/StatusBadge";
import { classifyHfa, classifyWfa } from "@/lib/zscore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  UserPlus,
  Baby,
  Calendar,
  MapPin,
  Scale,
  UtensilsCrossed,
  CheckCircle2,
  Loader2,
  X,
  Users,
  Pencil,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Check,
} from "lucide-react";
import { ParentLookupTable } from "./ParentLookupTable";
import {
  getCachedParents,
  setCachedParents,
  CachedParent,
  getCachedChildren,
  setCachedChildren,
  enqueueOfflineMutation,
} from "@/lib/offline";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";

interface ChildrenClientViewProps {
  initialChildren: ChildWithLatestMeasurement[];
  initialParents?: CachedParent[];
  canManage?: boolean;
}

export function ChildrenClientView({
  initialChildren,
  initialParents = [],
  canManage = true,
}: ChildrenClientViewProps) {
  // Inisialisasi: Jika initialChildren kosong (misal saat offline), langsung baca dari cache lokal!
  const [childrenList, setChildrenList] = useState<ChildWithLatestMeasurement[]>(() => {
    if (initialChildren && initialChildren.length > 0) return initialChildren;
    if (typeof window !== "undefined") {
      const cached = getCachedChildren();
      if (cached.length > 0) return cached;
    }
    return [];
  });
  const [parentsList, setParentsList] = useState<CachedParent[]>(() => {
    if (initialParents && initialParents.length > 0) return initialParents;
    if (typeof window !== "undefined") {
      const cached = getCachedParents();
      if (cached.length > 0) return cached;
    }
    return [];
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const { isOffline } = useOfflineStatus();

  // State untuk Edit Child Modal
  const [editingChild, setEditingChild] = useState<ChildWithLatestMeasurement | null>(null);
  const [editFormData, setEditFormData] = useState<ChildFormData>({
    name: "",
    birth_date: "",
    gender: "male",
    region: "",
    parent_id: "",
    relationship: "ibu",
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [isUpdatingChild, setIsUpdatingChild] = useState(false);

  // State untuk Delete Child Modal
  const [deletingChild, setDeletingChild] = useState<ChildWithLatestMeasurement | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletingChild, setIsDeletingChild] = useState(false);

  // Global action error banner (terpampang jelas di atas daftar balita)
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Sinkronkan state childrenList saat initialChildren diperbarui (misal saat login akun lain)
  useEffect(() => {
    if (initialChildren && initialChildren.length > 0) {
      setChildrenList(initialChildren);
      setCachedChildren(initialChildren);
    } else {
      // Jika server action mengembalikan kosong karena sedang offline / koneksi putus
      const cached = getCachedChildren();
      if (cached.length > 0) {
        setChildrenList(cached);
      } else {
        setChildrenList(initialChildren || []);
      }
    }
  }, [initialChildren]);

  // Sinkronkan daftar orang tua ke localStorage (Offline-first)
  useEffect(() => {
    if (initialParents && initialParents.length > 0) {
      setCachedParents(initialParents);
      setParentsList(initialParents);
    } else {
      const cached = getCachedParents();
      if (cached.length > 0) {
        setParentsList(cached);
      }
    }
  }, [initialParents]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ChildFormData>({
    resolver: zodResolver(childSchema),
    defaultValues: {
      name: "",
      birth_date: new Date().toISOString().split("T")[0],
      gender: "male",
      region: "Desa Sukamaju",
      parent_id: "",
      relationship: "ibu",
    },
  });

  const selectedParentId = watch("parent_id");
  const selectedRelationship = watch("relationship");

  const onSubmit = (data: ChildFormData) => {
    setFeedback(null);

    const isDeviceOffline = isOffline || (typeof navigator !== "undefined" && !navigator.onLine);

    const queueOfflineCreate = () => {
      const tempId = `temp_child_${Date.now()}`;
      const selectedParent = parentsList.find((p) => p.id === data.parent_id);
      const newChildEntry: ChildWithLatestMeasurement = {
        id: tempId,
        name: data.name,
        birth_date: data.birth_date,
        gender: data.gender,
        region: data.region,
        created_at: new Date().toISOString(),
        parents: data.parent_id && selectedParent ? [
          {
            parent_id: selectedParent.id,
            relationship: data.relationship || "ibu",
            parent: {
              id: selectedParent.id,
              full_name: selectedParent.full_name,
            },
          },
        ] : [],
      };

      const updated = [newChildEntry, ...childrenList];
      setChildrenList(updated);
      setCachedChildren(updated);

      enqueueOfflineMutation({
        type: "create_child",
        data: {
          ...data,
          temp_id: tempId,
        },
      });

      setFeedback({
        type: "success",
        message: `Mode Luring: Balita ${data.name} disimpan ke antrean lokal dan akan disinkronkan saat online.`,
      });
      reset();
      setShowAddForm(false);
    };

    // Jika perangkat sedang offline / simulasi offline aktif
    if (isDeviceOffline) {
      queueOfflineCreate();
      return;
    }

    startTransition(async () => {
      try {
        const res = await createChild(data);
        if (res.success && res.data) {
          // Gabungkan data baru dengan relasi orang tua yang baru saja dipilih
          const selectedParent = parentsList.find((p) => p.id === data.parent_id);
          const newChildEntry: ChildWithLatestMeasurement = {
            ...res.data,
            parents: data.parent_id && selectedParent ? [
              {
                parent_id: selectedParent.id,
                relationship: data.relationship || "ibu",
                parent: {
                  id: selectedParent.id,
                  full_name: selectedParent.full_name,
                },
              },
            ] : [],
          };

          const updated = [newChildEntry, ...childrenList];
          setChildrenList(updated);
          setCachedChildren(updated);
          setFeedback({
            type: "success",
            message: `Balita ${res.data.name} berhasil didaftarkan${
              selectedParent ? ` dan ditautkan ke orang tua (${selectedParent.full_name})` : ""
            }!`,
          });
          reset();
          setShowAddForm(false);
        } else {
          const errorMsg = res.error || "";
          const isNetworkOrSessionFailure =
            !navigator.onLine ||
            errorMsg.includes("login terlebih dahulu") ||
            errorMsg.toLowerCase().includes("fetch") ||
            errorMsg.toLowerCase().includes("network") ||
            errorMsg.toLowerCase().includes("koneksi");

          if (isNetworkOrSessionFailure) {
            queueOfflineCreate();
          } else {
            setFeedback({
              type: "error",
              message: errorMsg || "Gagal mendaftarkan balita",
            });
          }
        }
      } catch {
        queueOfflineCreate();
      }
    });
  };

  const handleOpenEdit = (child: ChildWithLatestMeasurement) => {
    setEditError(null);
    setActionError(null);
    setActionSuccess(null);
    setEditingChild(child);
    const existingParent = child.parents && child.parents.length > 0 ? child.parents[0] : null;
    setEditFormData({
      name: child.name,
      birth_date: child.birth_date,
      gender: child.gender,
      region: child.region,
      parent_id: existingParent?.parent_id || "",
      relationship: existingParent?.relationship || "ibu",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingChild) return;
    setEditError(null);
    setIsUpdatingChild(true);

    const isDeviceOffline = isOffline || (typeof navigator !== "undefined" && !navigator.onLine);

    if (isDeviceOffline) {
      const selectedParent = parentsList.find((p) => p.id === editFormData.parent_id);
      const updated = childrenList.map((c) =>
        c.id === editingChild.id
          ? {
              ...c,
              name: editFormData.name,
              birth_date: editFormData.birth_date,
              gender: editFormData.gender,
              region: editFormData.region,
              parents: editFormData.parent_id && selectedParent
                ? [
                    {
                      parent_id: selectedParent.id,
                      relationship: editFormData.relationship || "ibu",
                      parent: {
                        id: selectedParent.id,
                        full_name: selectedParent.full_name,
                      },
                    },
                  ]
                : [],
            }
          : c,
      );

      setChildrenList(updated);
      setCachedChildren(updated);

      enqueueOfflineMutation({
        type: "update_child",
        childId: editingChild.id,
        data: editFormData,
      });

      setActionSuccess(`Mode Luring: Perubahan data "${editFormData.name}" disimpan ke antrean lokal.`);
      setEditingChild(null);
      setIsUpdatingChild(false);
      return;
    }

    try {
      const res = await updateChild(editingChild.id, editFormData);
      if (res.success) {
        const selectedParent = parentsList.find((p) => p.id === editFormData.parent_id);
        const updated = childrenList.map((c) =>
          c.id === editingChild.id
            ? {
                ...c,
                name: editFormData.name,
                birth_date: editFormData.birth_date,
                gender: editFormData.gender,
                region: editFormData.region,
                parents: editFormData.parent_id && selectedParent
                  ? [
                      {
                        parent_id: selectedParent.id,
                        relationship: editFormData.relationship || "ibu",
                        parent: {
                          id: selectedParent.id,
                          full_name: selectedParent.full_name,
                        },
                      },
                    ]
                  : [],
              }
            : c,
        );
        setChildrenList(updated);
        setCachedChildren(updated);
        setActionSuccess(res.message || `Data balita "${editFormData.name}" berhasil diperbarui!`);
        setEditingChild(null);
      } else {
        setEditError(res.error || "Gagal memperbarui data balita");
      }
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Terjadi kesalahan sistem");
    } finally {
      setIsUpdatingChild(false);
    }
  };

  const handleOpenDelete = (child: ChildWithLatestMeasurement) => {
    setDeleteError(null);
    setActionError(null);
    setActionSuccess(null);
    setDeletingChild(child);
  };

  const handleDeleteChild = async () => {
    if (!deletingChild) return;
    setDeleteError(null);
    setIsDeletingChild(true);

    const isDeviceOffline = isOffline || (typeof navigator !== "undefined" && !navigator.onLine);

    if (isDeviceOffline) {
      const updated = childrenList.filter((c) => c.id !== deletingChild.id);
      setChildrenList(updated);
      setCachedChildren(updated);

      enqueueOfflineMutation({
        type: "delete_child",
        childId: deletingChild.id,
        childName: deletingChild.name,
      });

      setActionSuccess(`Mode Luring: Balita "${deletingChild.name}" dihapus secara lokal dan dimasukkan ke antrean.`);
      setDeletingChild(null);
      setIsDeletingChild(false);
      return;
    }

    try {
      const res = await deleteChild(deletingChild.id);
      if (res.success) {
        const updated = childrenList.filter((c) => c.id !== deletingChild.id);
        setChildrenList(updated);
        setCachedChildren(updated);
        setActionSuccess(res.message || "Data balita berhasil dihapus.");
        setDeletingChild(null);
      } else {
        setDeleteError(res.error || "Gagal menghapus data balita");
      }
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Terjadi kesalahan sistem");
    } finally {
      setIsDeletingChild(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Baris Tombol Aksi & Pencarian */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          Menampilkan <span className="font-semibold text-foreground">{childrenList.length}</span> balita terdaftar
        </span>

        {canManage && (
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? (
              <>
                <X className="w-3.5 h-3.5" />
                Batal
              </>
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5" />
                Daftarkan Balita Baru
              </>
            )}
          </Button>
        )}
      </div>

      {/* Formulir Pendaftaran Balita Baru */}
      {showAddForm && (
        <Card className="border shadow-sm bg-muted/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Baby className="w-4 h-4 text-primary" />
              Formulir Pendaftaran Balita Posyandu
            </CardTitle>
            <CardDescription className="text-xs">
              Mendaftarkan data induk balita untuk pemantauan kurva pertumbuhan rutin
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nama Lengkap Balita</Label>
                <Input id="name" placeholder="misal: Siti Rahma" {...register("name")} className="h-9 text-xs" />
                {errors.name && <p className="text-destructive text-[11px]">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="birth_date">Tanggal Lahir</Label>
                <Input id="birth_date" type="date" {...register("birth_date")} className="h-9 text-xs" />
                {errors.birth_date && <p className="text-destructive text-[11px]">{errors.birth_date.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gender">Jenis Kelamin</Label>
                <select
                  id="gender"
                  {...register("gender")}
                  className="w-full h-9 px-3 rounded-md border bg-background text-foreground text-xs"
                >
                  <option value="male">Laki-laki</option>
                  <option value="female">Perempuan</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="region">Wilayah / Desa / RW</Label>
                <Input id="region" placeholder="misal: Desa Sukamaju" {...register("region")} className="h-9 text-xs" />
                {errors.region && <p className="text-destructive text-[11px]">{errors.region.message}</p>}
              </div>

              {/* Komponen Pencarian & Tabel Pemilihan Orang Tua (Offline-Ready) */}
              <div className="sm:col-span-2">
                <ParentLookupTable
                  parents={parentsList}
                  selectedParentId={selectedParentId}
                  selectedRelationship={selectedRelationship}
                  onSelect={(parentId, rel) => {
                    setValue("parent_id", parentId);
                    setValue("relationship", rel);
                  }}
                  onClear={() => {
                    setValue("parent_id", "");
                  }}
                  isOffline={isOffline}
                />
              </div>

              <div className="sm:col-span-2 pt-2 flex items-center justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowAddForm(false)}>
                  Batal
                </Button>
                <Button type="submit" size="sm" className="h-8 text-xs gap-1.5" disabled={isPending}>
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Simpan Data Balita
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {feedback && (
        <div
          className={`p-3 rounded-md text-xs border flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border-emerald-500/30"
              : "bg-destructive/10 text-destructive border-destructive/20"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Notifikasi feedback aksi global balita */}
      {actionSuccess && (
        <div className="p-3 rounded-lg text-xs flex items-center justify-between border bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3 rounded-lg text-xs flex items-start justify-between border bg-destructive/10 border-destructive/30 text-destructive">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold block">Gagal Melakukan Aksi Balita:</span>
              <span className="font-mono text-[11px] break-all">{actionError}</span>
            </div>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-destructive/80 hover:text-destructive"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Grid Kartu Balita atau Empty State */}
      {childrenList.length === 0 ? (
        <Card className="border border-dashed shadow-sm">
          <CardContent className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
              <Baby className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-foreground">
                Belum Ada Data Balita Terdaftar
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {canManage
                  ? "Belum ada balita binaan yang tercatat di sistem atau cache lokal. Klik tombol 'Daftarkan Balita Baru' di atas untuk memulai pencatatan."
                  : "Belum ada data balita yang ditautkan ke akun Anda. Harap hubungi Kader Posyandu atau Ahli Gizi untuk menghubungkan NIK / nama anak Anda."}
              </p>
            </div>
            {canManage && (
              <Button
                size="sm"
                className="text-xs gap-1.5 mt-2"
                onClick={() => setShowAddForm(true)}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Daftarkan Balita Sekarang
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {childrenList.map((child) => {
          const latest = child.measurements && child.measurements.length > 0
            ? child.measurements[child.measurements.length - 1]
            : null;

          return (
            <Card key={child.id} className="border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-foreground">{child.name}</span>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                        {child.gender === "male" ? "Laki-laki" : "Perempuan"}
                      </Badge>
                      {child.parents && child.parents.length > 0 && (
                        <div className="flex items-center gap-1">
                          {child.parents.map((p, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-[10px] py-0 px-1.5 gap-1 bg-primary/10 text-primary border-primary/20"
                            >
                              <Users className="w-2.5 h-2.5" />
                              <span className="capitalize">{p.relationship}</span>: {p.parent?.full_name || "Orang Tua"}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Lahir: {child.birth_date}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {child.region}
                      </span>
                    </div>
                  </div>

                  {/* Tombol Edit & Hapus (Kader, Ahli Gizi, Admin) */}
                  {canManage && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        title="Edit data balita"
                        onClick={() => handleOpenEdit(child)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        title="Hapus data balita"
                        onClick={() => handleOpenDelete(child)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Status Pengukuran Terakhir */}
                <div className="p-2.5 rounded-lg bg-muted/40 border text-xs space-y-2">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                    Pengukuran Terakhir: {latest ? `${latest.measured_at} (${latest.age_months} bln)` : "Belum diukur"}
                  </span>

                  {latest ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span>TB: {latest.height_cm} cm</span>
                        <span>BB: {latest.weight_kg} kg</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <StatusBadge
                          type="hfa"
                          status={classifyHfa(latest.zscore_hfa)}
                          zscore={latest.zscore_hfa}
                          showScore={false}
                        />
                        <StatusBadge
                          type="wfa"
                          status={classifyWfa(latest.zscore_wfa)}
                          zscore={latest.zscore_wfa}
                          showScore={false}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic">
                      Belum ada catatan antropometri. Klik catat untuk memulai.
                    </p>
                  )}
                </div>

                {/* Tombol Aksi Pintas */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t text-xs">
                  <Link href={`/recipes?child_id=${child.id}`}>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                      <UtensilsCrossed className="w-3.5 h-3.5" />
                      Resep Gizi
                    </Button>
                  </Link>

                  <Link href={`/z-score`}>
                    <Button size="sm" className="h-7 text-xs gap-1">
                      <Scale className="w-3.5 h-3.5" />
                      Catat Ukur
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
        </div>
      )}

      {/* Modal / Dialog Edit Balita */}
      {editingChild && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-card border rounded-xl shadow-2xl p-5 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm text-foreground">Edit Rekam Data Balita</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingChild(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error banner dialog edit balita */}
            {editError && (
              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold block">Gagal Memperbarui Balita:</span>
                  <span className="font-mono text-[11px] break-all">{editError}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="edit-child-name" className="text-xs font-semibold">
                  Nama Lengkap Balita
                </Label>
                <Input
                  id="edit-child-name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="h-8 text-xs"
                  placeholder="Nama Lengkap Balita"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-birth-date" className="text-xs font-semibold">
                  Tanggal Lahir
                </Label>
                <Input
                  id="edit-birth-date"
                  type="date"
                  value={editFormData.birth_date}
                  onChange={(e) => setEditFormData({ ...editFormData, birth_date: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-gender" className="text-xs font-semibold">
                  Jenis Kelamin
                </Label>
                <select
                  id="edit-gender"
                  value={editFormData.gender}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, gender: e.target.value as "male" | "female" })
                  }
                  className="w-full h-8 px-2.5 rounded-md border bg-background text-foreground text-xs"
                >
                  <option value="male">Laki-laki</option>
                  <option value="female">Perempuan</option>
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="edit-region" className="text-xs font-semibold">
                  Wilayah / Desa / RW
                </Label>
                <Input
                  id="edit-region"
                  value={editFormData.region}
                  onChange={(e) => setEditFormData({ ...editFormData, region: e.target.value })}
                  className="h-8 text-xs"
                  placeholder="Nama Desa / Posyandu"
                />
              </div>

              {/* Pemilihan Orang Tua Terhubung */}
              <div className="sm:col-span-2 pt-1">
                <ParentLookupTable
                  parents={parentsList}
                  selectedParentId={editFormData.parent_id}
                  selectedRelationship={editFormData.relationship}
                  onSelect={(parentId, rel) => {
                    setEditFormData({ ...editFormData, parent_id: parentId, relationship: rel });
                  }}
                  onClear={() => {
                    setEditFormData({ ...editFormData, parent_id: "" });
                  }}
                  isOffline={isOffline}
                />
              </div>

              <div className="sm:col-span-2 text-[11px] text-muted-foreground font-mono bg-muted/30 p-2 rounded border">
                Child ID: {editingChild.id}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setEditingChild(null)}
                disabled={isUpdatingChild}
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground"
                onClick={handleSaveEdit}
                disabled={isUpdatingChild}
              >
                {isUpdatingChild ? (
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

      {/* Modal / Dialog Konfirmasi Hapus Balita */}
      {deletingChild && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-card border border-destructive/30 rounded-xl shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center gap-2 text-destructive border-b pb-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-sm">Konfirmasi Hapus Data Balita</h3>
            </div>

            {/* Error banner dialog delete balita */}
            {deleteError && (
              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold block">Gagal Menghapus Balita:</span>
                  <span className="font-mono text-[11px] break-all">{deleteError}</span>
                </div>
              </div>
            )}

            <p className="text-muted-foreground leading-relaxed">
              Apakah Anda yakin ingin menghapus data rekam balita{" "}
              <strong className="text-foreground">{deletingChild.name}</strong>?
            </p>

            <div className="p-2.5 rounded-lg bg-destructive/5 border border-destructive/20 text-destructive text-[11px] leading-relaxed">
              ⚠️ <strong>Perhatian:</strong> Menghapus balita ini juga akan menghapus seluruh catatan
              pengukuran antropometri (Z-Score) dan riwayat intervensi gizinya. Tindakan ini tidak dapat dibatalkan.
            </div>

            <div className="text-[11px] font-mono text-muted-foreground bg-muted/40 p-2 rounded border">
              ID: {deletingChild.id}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setDeletingChild(null)}
                disabled={isDeletingChild}
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="h-8 text-xs gap-1.5"
                onClick={handleDeleteChild}
                disabled={isDeletingChild}
              >
                {isDeletingChild ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus Balita
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
