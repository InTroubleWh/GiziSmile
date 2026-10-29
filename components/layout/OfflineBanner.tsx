"use client";

import { useState } from "react";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import {
  getUnifiedOfflineQueue,
  removeOfflineMutation,
} from "@/lib/offline";
import { processOfflineMutations } from "@/actions/sync";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export function OfflineBanner() {
  const { isOnline, isSimulatedOffline, isOffline, queueCount, toggleSimulation, refreshQueue } =
    useOfflineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleSync = async () => {
    const queue = getUnifiedOfflineQueue();
    if (queue.length === 0) return;

    setIsSyncing(true);
    setSyncFeedback(null);

    try {
      const res = await processOfflineMutations(queue);
      if (res.processedIds.length > 0) {
        for (const id of res.processedIds) {
          removeOfflineMutation(id);
        }
        refreshQueue();
      }

      if (res.success) {
        setSyncFeedback({
          type: "success",
          message: `Berhasil menyinkronkan seluruh ${res.synced} data ke database cloud!`,
        });
      } else {
        setSyncFeedback({
          type: "error",
          message: `Tersinkron ${res.synced} dari ${res.total} data. Error: ${res.errors.join("; ")}`,
        });
      }
    } catch (err: unknown) {
      setSyncFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Terjadi kesalahan saat sinkronisasi",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Jangan render apa pun jika online dan tidak ada antrean serta simulasi mati
  if (isOnline && !isSimulatedOffline && queueCount === 0 && !syncFeedback) {
    return null;
  }

  return (
    <div
      className={`w-full py-2.5 px-4 text-xs transition-colors border-b flex flex-wrap items-center justify-between gap-3 ${
        isOffline
          ? "bg-amber-500/10 text-amber-900 dark:text-amber-200 border-amber-500/30"
          : "bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 border-emerald-500/30"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 flex-wrap">
        {isOffline ? (
          <div className="flex items-center gap-1.5 font-medium">
            <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              {isSimulatedOffline ? "Mode Simulasi Offline Aktif" : "Perangkat Luring (Offline)"}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 font-medium">
            <Wifi className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Koneksi Online Stabil</span>
          </div>
        )}

        <span className="text-muted-foreground hidden sm:inline">•</span>

        {queueCount > 0 ? (
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="bg-background text-foreground font-semibold px-2 py-0.5">
              {queueCount} data di antrean lokal
            </Badge>
            <span className="text-muted-foreground hidden md:inline">
              Data tersimpan aman di peramban dan siap disinkronkan.
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">Seluruh data tersinkronisasi.</span>
        )}

        {syncFeedback && (
          <span
            className={`flex items-center gap-1 font-medium ${
              syncFeedback.type === "success"
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-destructive"
            }`}
          >
            {syncFeedback.type === "success" ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            )}
            {syncFeedback.message}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Tombol Sync Sekarang jika ada antrean dan koneksi fisik online */}
        {queueCount > 0 && isOnline && (
          <Button
            size="sm"
            variant="default"
            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Menyinkronkan..." : `Sync Sekarang (${queueCount})`}
          </Button>
        )}

        {/* Tombol Sakelar Simulasi Khusus Evaluasi Juri */}
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1 border-current/40 hover:bg-background/80"
          onClick={toggleSimulation}
          title="Uji coba ketahanan sistem saat kader kehilangan koneksi di lapangan"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          {isSimulatedOffline ? "Matikan Simulasi" : "Simulasi Mode Offline"}
        </Button>
      </div>
    </div>
  );
}
