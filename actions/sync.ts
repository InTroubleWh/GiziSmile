"use server";

import {
  createMeasurement,
  CreateMeasurementResponse,
} from "./measurements";
import {
  createChild,
  updateChild,
  deleteChild,
} from "./children";
import { OfflineMutation } from "@/lib/offline";

export interface SyncProcessResult {
  success: boolean;
  total: number;
  synced: number;
  failed: number;
  errors: string[];
  processedIds: string[];
}

/**
 * Memproses dan mengeksekusi antrean mutasi offline secara sekuensial di server
 */
export async function processOfflineMutations(
  mutations: OfflineMutation[],
): Promise<SyncProcessResult> {
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];
  const processedIds: string[] = [];

  for (let i = 0; i < mutations.length; i++) {
    const item = mutations[i];
    try {
      if (item.type === "measurement") {
        const res: CreateMeasurementResponse = await createMeasurement(item.data);
        if (res.success) {
          synced++;
          processedIds.push(item.id);
        } else {
          failed++;
          errors.push(
            `Pengukuran #${i + 1} (${item.data.child_name || "Balita"}): ${res.error || "Gagal menyimpan"}`,
          );
        }
      } else if (item.type === "create_child") {
        const res = await createChild({
          name: item.data.name,
          birth_date: item.data.birth_date,
          gender: item.data.gender,
          region: item.data.region,
          parent_id: item.data.parent_id,
          relationship: item.data.relationship,
        });
        if (res.success) {
          synced++;
          processedIds.push(item.id);
        } else {
          failed++;
          errors.push(`Pendaftaran balita (${item.data.name}): ${res.error || "Gagal"}`);
        }
      } else if (item.type === "update_child") {
        const res = await updateChild(item.childId, item.data);
        if (res.success) {
          synced++;
          processedIds.push(item.id);
        } else {
          failed++;
          errors.push(`Pembaruan balita (${item.data.name}): ${res.error || "Gagal"}`);
        }
      } else if (item.type === "delete_child") {
        const res = await deleteChild(item.childId);
        if (res.success) {
          synced++;
          processedIds.push(item.id);
        } else {
          failed++;
          errors.push(`Penghapusan balita (${item.childName}): ${res.error || "Gagal"}`);
        }
      }
    } catch (err: unknown) {
      failed++;
      errors.push(
        `Item #${i + 1}: ${err instanceof Error ? err.message : "Kesalahan sistem saat sinkronisasi"}`,
      );
    }
  }

  return {
    success: failed === 0,
    total: mutations.length,
    synced,
    failed,
    errors,
    processedIds,
  };
}
