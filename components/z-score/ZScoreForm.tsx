"use client";

import { useState, useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { measurementSchema, MeasurementFormData } from "@/lib/validators";
import { calculateZScore, ZScoreResult } from "@/lib/zscore";
import { createMeasurement } from "@/actions/measurements";
import { addToOfflineQueue, getCachedChildren } from "@/lib/offline";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { StatusBadge } from "@/components/z-score/StatusBadge";
import { GrowthChart } from "@/components/z-score/GrowthChart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import {
  Sparkles,
  Save,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Calculator,
  LogIn,
  UserCheck,
} from "lucide-react";

interface ChildOption {
  id: string;
  name: string;
  gender: "male" | "female";
  birth_date: string;
  latest_measurement?: {
    age_months: number;
    height_cm: number;
    weight_kg: number;
    measured_at?: string;
  };
}

interface ZScoreFormProps {
  childrenList?: ChildOption[];
}

/**
 * Menghitung selisih umur dalam bulan secara akurat dari tanggal lahir
 */
function calculateAgeMonths(birthDateStr: string, targetDateStr?: string): number {
  try {
    const birth = new Date(birthDateStr);
    const target = targetDateStr ? new Date(targetDateStr) : new Date();
    if (isNaN(birth.getTime()) || isNaN(target.getTime())) return 24;

    let months = (target.getFullYear() - birth.getFullYear()) * 12 + (target.getMonth() - birth.getMonth());
    if (target.getDate() < birth.getDate()) {
      months -= 1;
    }
    return Math.max(0, Math.min(60, months));
  } catch {
    return 24;
  }
}

export function ZScoreForm({ childrenList = [] }: ZScoreFormProps) {
  const { isOffline, refreshQueue } = useOfflineStatus();
  const [isPending, startTransition] = useTransition();
  const [saveFeedback, setSaveFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null,
  );

  // Ambil data balita aktif dari props atau dari cache lokal (offline-first)
  const [activeChildren, setActiveChildren] = useState<ChildOption[]>(() => {
    if (childrenList.length > 0) return childrenList;
    const cached = getCachedChildren();
    if (cached.length > 0) {
      return cached.map((c) => ({
        id: c.id,
        name: c.name,
        gender: c.gender,
        birth_date: c.birth_date,
        latest_measurement: c.measurements && c.measurements.length > 0
          ? c.measurements[c.measurements.length - 1]
          : undefined,
      }));
    }
    return [];
  });

  useEffect(() => {
    if (childrenList.length > 0) {
      setActiveChildren(childrenList);
    } else {
      const cached = getCachedChildren();
      if (cached.length > 0) {
        setActiveChildren(
          cached.map((c) => ({
            id: c.id,
            name: c.name,
            gender: c.gender,
            birth_date: c.birth_date,
            latest_measurement: c.measurements && c.measurements.length > 0
              ? c.measurements[c.measurements.length - 1]
              : undefined,
          })),
        );
      }
    }
  }, [childrenList]);

  const defaultChild = activeChildren[0] || null;
  const isGuestMode = activeChildren.length === 0;

  const initialAge = defaultChild
    ? defaultChild.latest_measurement?.age_months ?? calculateAgeMonths(defaultChild.birth_date)
    : 24;
  const initialHeight = defaultChild?.latest_measurement?.height_cm ?? 85.0;
  const initialWeight = defaultChild?.latest_measurement?.weight_kg ?? 11.0;

  const [calculationResult, setCalculationResult] = useState<ZScoreResult>(() =>
    calculateZScore({
      gender: defaultChild?.gender || "male",
      age_months: initialAge,
      height_cm: initialHeight,
      weight_kg: initialWeight,
    })
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MeasurementFormData>({
    resolver: zodResolver(measurementSchema),
    defaultValues: {
      child_id: defaultChild?.id || (isGuestMode ? "guest_child" : ""),
      measured_at: defaultChild?.latest_measurement?.measured_at || new Date().toISOString().split("T")[0],
      gender: defaultChild?.gender || "male",
      age_months: initialAge,
      height_cm: initialHeight,
      weight_kg: initialWeight,
    },
  });

  const formValues = watch();

  // Reaktivitas Otomatis: Setiap kali input antropometri berubah, hitung Z-score seketika
  useEffect(() => {
    if (
      typeof formValues.age_months === "number" &&
      !isNaN(formValues.age_months) &&
      typeof formValues.height_cm === "number" &&
      !isNaN(formValues.height_cm) &&
      typeof formValues.weight_kg === "number" &&
      !isNaN(formValues.weight_kg)
    ) {
      const res = calculateZScore({
        gender: formValues.gender,
        age_months: Number(formValues.age_months),
        height_cm: Number(formValues.height_cm),
        weight_kg: Number(formValues.weight_kg),
      });
      setCalculationResult(res);
    }
  }, [formValues.gender, formValues.age_months, formValues.height_cm, formValues.weight_kg]);

  // Sinkronisasi otomatis form saat balita terpilih berganti
  const handleChildSelect = (childId: string) => {
    const selected = activeChildren.find((c) => c.id === childId);
    if (!selected) return;

    setValue("child_id", selected.id);
    setValue("gender", selected.gender);

    if (selected.latest_measurement) {
      // Balita memiliki data pengukuran riwayat: gunakan angka aktual terakhir
      setValue("age_months", selected.latest_measurement.age_months);
      setValue("height_cm", selected.latest_measurement.height_cm);
      setValue("weight_kg", selected.latest_measurement.weight_kg);
    } else {
      // Balita baru: hitung usia bulan otomatis dari tanggal lahir
      const calculatedAge = calculateAgeMonths(selected.birth_date, formValues.measured_at);
      setValue("age_months", calculatedAge);
    }
  };

  const handleCalculateInstant = () => {
    if (formValues.height_cm && formValues.weight_kg && typeof formValues.age_months === "number") {
      const res = calculateZScore({
        gender: formValues.gender,
        age_months: Number(formValues.age_months),
        height_cm: Number(formValues.height_cm),
        weight_kg: Number(formValues.weight_kg),
      });
      setCalculationResult(res);
    }
  };

  const onSubmit = async (data: MeasurementFormData) => {
    setSaveFeedback(null);

    // Hitung Z-score lokal terlebih dahulu agar hasil selalu tampil
    const localZScores = calculateZScore(data);
    setCalculationResult(localZScores);

    if (isGuestMode) {
      setSaveFeedback({
        type: "error",
        message: "Mode Tamu: Hasil perhitungan Z-Score dan kurva WHO tampil instan. Silakan Masuk terlebih dahulu untuk menyimpan rekam medis balita.",
      });
      return;
    }

    const isDeviceOffline = isOffline || (typeof navigator !== "undefined" && !navigator.onLine);

    if (isDeviceOffline) {
      // Simpan ke antrean localStorage saat offline
      const childObj = activeChildren.find((c) => c.id === data.child_id);
      addToOfflineQueue({
        ...data,
        child_name: childObj?.name || "Balita Posyandu",
        preview_zscores: {
          zscore_hfa: localZScores.zscore_hfa,
          zscore_wfa: localZScores.zscore_wfa,
          zscore_wfh: localZScores.zscore_wfh,
          status_hfa: localZScores.status_hfa,
          status_wfa: localZScores.status_wfa,
          status_wfh: localZScores.status_wfh,
          needs_intervention: localZScores.needs_intervention,
        },
      });
      refreshQueue();
      setSaveFeedback({
        type: "success",
        message: "Perangkat offline: Data pengukuran disimpan ke antrean lokal dan siap disinkronkan saat online.",
      });
      return;
    }

    // Jalankan Server Action saat online
    startTransition(async () => {
      try {
        const res = await createMeasurement(data);
        if (res.success) {
          setSaveFeedback({
            type: "success",
            message: "Data pengukuran berhasil disimpan ke database cloud!",
          });
          if (res.zScores) setCalculationResult(res.zScores);
        } else {
          const errorMsg = res.error || "";
          const isNetworkOrSessionFailure =
            !navigator.onLine ||
            errorMsg.includes("Sesi login tidak ditemukan") ||
            errorMsg.includes("jaringan offline") ||
            errorMsg.toLowerCase().includes("fetch") ||
            errorMsg.toLowerCase().includes("network") ||
            errorMsg.toLowerCase().includes("koneksi");

          if (isNetworkOrSessionFailure) {
            const childObj = activeChildren.find((c) => c.id === data.child_id);
            addToOfflineQueue({
              ...data,
              child_name: childObj?.name || "Balita Posyandu",
              preview_zscores: {
                zscore_hfa: localZScores.zscore_hfa,
                zscore_wfa: localZScores.zscore_wfa,
                zscore_wfh: localZScores.zscore_wfh,
                status_hfa: localZScores.status_hfa,
                status_wfa: localZScores.status_wfa,
                status_wfh: localZScores.status_wfh,
                needs_intervention: localZScores.needs_intervention,
              },
            });
            refreshQueue();
            setSaveFeedback({
              type: "success",
              message:
                "Koneksi terputus: Data pengukuran otomatis dialihkan ke antrean offline lokal dan siap disinkronkan saat online.",
            });
          } else {
            setSaveFeedback({
              type: "error",
              message: errorMsg || "Gagal menyimpan data ke database.",
            });
          }
        }
      } catch {
        // Exception jaringan / fetch failure dari Server Action
        const childObj = activeChildren.find((c) => c.id === data.child_id);
        addToOfflineQueue({
          ...data,
          child_name: childObj?.name || "Balita Posyandu",
          preview_zscores: {
            zscore_hfa: localZScores.zscore_hfa,
            zscore_wfa: localZScores.zscore_wfa,
            zscore_wfh: localZScores.zscore_wfh,
            status_hfa: localZScores.status_hfa,
            status_wfa: localZScores.status_wfa,
            status_wfh: localZScores.status_wfh,
            needs_intervention: localZScores.needs_intervention,
          },
        });
        refreshQueue();
        setSaveFeedback({
          type: "success",
          message:
            "Koneksi server terputus: Data pengukuran otomatis diamankan ke antrean offline lokal.",
        });
      }
    });
  };

  const selectedChild = activeChildren.find((c) => c.id === formValues.child_id) || defaultChild;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Kolom Kiri: Form Input Pengukuran */}
      <div className="lg:col-span-5 space-y-6">
        <Card className="border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold flex items-center justify-between">
              <span>Input Antropometri Balita</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleCalculateInstant}
              >
                <Calculator className="w-3.5 h-3.5" />
                Hitung Cepat
              </Button>
            </CardTitle>
            <CardDescription className="text-xs">
              {isGuestMode
                ? "Mode Tamu: Perhitungan kurva baku WHO berjalan instan tanpa perlu masuk akun."
                : "Mendukung input daring (cloud sync) maupun luring (antrean lokal)."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
              {/* Pemilihan Balita */}
              <div className="space-y-1.5">
                <Label htmlFor="child_id">Pilih Balita</Label>
                {activeChildren.length > 0 ? (
                  <select
                    id="child_id"
                    {...register("child_id")}
                    onChange={(e) => handleChildSelect(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary"
                  >
                    {activeChildren.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.gender === "male" ? "Laki-laki" : "Perempuan"})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2.5 rounded-md border bg-muted/40 text-xs flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-medium">
                      <UserCheck className="w-3.5 h-3.5 text-primary" />
                      Mode Tamu / Kalkulator Mandiri
                    </span>
                    <span className="text-[10px] bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded">
                      Cepat
                    </span>
                  </div>
                )}
                {errors.child_id && !isGuestMode && (
                  <p className="text-destructive text-[11px]">{errors.child_id.message}</p>
                )}
              </div>

              {/* Tanggal Pengukuran */}
              <div className="space-y-1.5">
                <Label htmlFor="measured_at">Tanggal Pengukuran</Label>
                <Input
                  id="measured_at"
                  type="date"
                  {...register("measured_at")}
                  className="h-9 text-xs"
                />
                {errors.measured_at && (
                  <p className="text-destructive text-[11px]">{errors.measured_at.message}</p>
                )}
              </div>

              {/* Jenis Kelamin */}
              <div className="space-y-1.5">
                <Label>Jenis Kelamin</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={formValues.gender === "male" ? "default" : "outline"}
                    className="h-8 text-xs font-normal"
                    onClick={() => setValue("gender", "male")}
                  >
                    Laki-laki
                  </Button>
                  <Button
                    type="button"
                    variant={formValues.gender === "female" ? "default" : "outline"}
                    className="h-8 text-xs font-normal"
                    onClick={() => setValue("gender", "female")}
                  >
                    Perempuan
                  </Button>
                </div>
              </div>

              {/* Usia (Bulan) */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <Label htmlFor="age_months">Usia (Bulan: 0 s.d. 60)</Label>
                  <span className="text-[11px] text-muted-foreground">{formValues.age_months} bulan</span>
                </div>
                <Input
                  id="age_months"
                  type="number"
                  min="0"
                  max="60"
                  step="1"
                  {...register("age_months", { valueAsNumber: true })}
                  className="h-9 text-xs"
                />
                {errors.age_months && (
                  <p className="text-destructive text-[11px]">{errors.age_months.message}</p>
                )}
              </div>

              {/* Tinggi Badan & Berat Badan (2 Kolom) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="height_cm">Tinggi Badan (cm)</Label>
                  <Input
                    id="height_cm"
                    type="number"
                    min="45"
                    max="120"
                    step="0.1"
                    placeholder="misal: 85.0"
                    {...register("height_cm", { valueAsNumber: true })}
                    className="h-9 text-xs"
                  />
                  {errors.height_cm && (
                    <p className="text-destructive text-[11px]">{errors.height_cm.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="weight_kg">Berat Badan (kg)</Label>
                  <Input
                    id="weight_kg"
                    type="number"
                    min="1.5"
                    max="35"
                    step="0.1"
                    placeholder="misal: 11.2"
                    {...register("weight_kg", { valueAsNumber: true })}
                    className="h-9 text-xs"
                  />
                  {errors.weight_kg && (
                    <p className="text-destructive text-[11px]">{errors.weight_kg.message}</p>
                  )}
                </div>
              </div>

              {/* Notifikasi Hasil Simpan */}
              {saveFeedback && (
                <div
                  className={`p-3 rounded-md text-xs border flex items-start gap-2 ${
                    saveFeedback.type === "success"
                      ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border-emerald-500/30"
                      : "bg-destructive/10 text-destructive border-destructive/20"
                  }`}
                >
                  {saveFeedback.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{saveFeedback.message}</span>
                </div>
              )}

              {/* Tombol Simpan atau Tombol Mode Tamu */}
              {isGuestMode ? (
                <div className="space-y-2 pt-1">
                  <Button
                    type="button"
                    onClick={handleCalculateInstant}
                    className="w-full h-9 font-medium gap-2"
                  >
                    <Calculator className="w-4 h-4" />
                    Perbarui Perhitungan Z-Score
                  </Button>
                  <Link href="/login" className="block w-full">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-9 text-xs font-semibold gap-1.5 border-dashed text-primary hover:text-primary"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      Masuk Akun untuk Simpan Rekam Medis
                    </Button>
                  </Link>
                </div>
              ) : (
                <Button type="submit" className="w-full h-9 font-medium gap-2" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan Data...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {isOffline ? "Simpan ke Antrean Offline" : "Simpan Pengukuran (Cloud)"}
                    </>
                  )}
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Kolom Kanan: Pratinjau Z-Score & Kurva Pertumbuhan Interaktif */}
      <div className="lg:col-span-7 space-y-6">
        {/* Ringkasan Status Gizi 3 Indikator */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Hasil Analisis Status Gizi WHO Z-Score
            </CardTitle>
            <CardDescription className="text-xs">
              Dihitung otomatis menggunakan parameter baku LMS World Health Organization
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* TB/U (Stunting) */}
              <div className="p-3 rounded-lg border bg-card space-y-2 flex flex-col justify-start min-w-0">
                <span className="text-[11px] text-muted-foreground font-medium block">
                  1. TB/U (Stunting)
                </span>
                <div className="w-full flex-1 flex flex-col">
                  <StatusBadge
                    type="hfa"
                    status={calculationResult.status_hfa}
                    zscore={calculationResult.zscore_hfa}
                  />
                </div>
              </div>

              {/* BB/U (Underweight) */}
              <div className="p-3 rounded-lg border bg-card space-y-2 flex flex-col justify-start min-w-0">
                <span className="text-[11px] text-muted-foreground font-medium block">
                  2. BB/U (Underweight)
                </span>
                <div className="w-full flex-1 flex flex-col">
                  <StatusBadge
                    type="wfa"
                    status={calculationResult.status_wfa}
                    zscore={calculationResult.zscore_wfa}
                  />
                </div>
              </div>

              {/* BB/TB (Wasting) */}
              <div className="p-3 rounded-lg border bg-card space-y-2 flex flex-col justify-start min-w-0">
                <span className="text-[11px] text-muted-foreground font-medium block">
                  3. BB/TB (Wasting)
                </span>
                <div className="w-full flex-1 flex flex-col">
                  <StatusBadge
                    type="wfh"
                    status={calculationResult.status_wfh}
                    zscore={calculationResult.zscore_wfh}
                  />
                </div>
              </div>
            </div>

            {/* Peringatan Dini Intervensi Gizi Cerdas */}
            {calculationResult?.needs_intervention && (
              <div className="p-4 rounded-lg border border-amber-500/40 bg-amber-500/10 space-y-2">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-semibold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Peringatan Dini: Balita Terindikasi Mengalami Defisit Pertumbuhan</span>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Ditemukan indikator Z-score di bawah -2 SD (
                  {calculationResult.is_stunted && "Stunting "}
                  {calculationResult.is_underweight && "Underweight "}
                  {calculationResult.is_wasted && "Wasting"}
                  ). Segera rekomendasikan menu pangan padat gizi lokal berbiaya terjangkau.
                </p>
                <div className="pt-1">
                  <Link href={formValues.child_id && !isGuestMode ? `/recipes?child_id=${formValues.child_id}` : "/recipes"}>
                    <Button size="sm" className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1.5">
                      Lihat Resep Gizi Cerdas Berbasis Pasar
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Visualisasi Kurva Pertumbuhan WHO */}
        <GrowthChart
          gender={formValues.gender}
          ageMonths={Number(formValues.age_months) || 24}
          heightCm={Number(formValues.height_cm) || 85.0}
          weightKg={Number(formValues.weight_kg) || 11.0}
          childName={selectedChild?.name || "Balita (Kalkulator Mandiri)"}
        />
      </div>
    </div>
  );
}
