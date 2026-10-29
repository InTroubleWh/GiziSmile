import { OfflineQueueItem, ChildFormData } from "./validators";
import type { ChildWithLatestMeasurement } from "@/actions/children";
import type { SmartRecipe } from "./recipe-engine";
import type { CommodityWithNutrition } from "@/actions/recipes";

// ==========================================
// 1. Storage Keys
// ==========================================
const OFFLINE_QUEUE_KEY = "gizismile_offline_measurements";
const OFFLINE_UNIFIED_QUEUE_KEY = "gizismile_unified_offline_queue";

const CACHE_USER_KEY = "gizismile_cache_user";
const CACHE_CHILDREN_KEY = "gizismile_cache_children";
const CACHE_RECIPES_KEY = "gizismile_cache_recipes";
const CACHE_COMMODITIES_KEY = "gizismile_cache_commodities";
const OFFLINE_PARENTS_KEY = "gizismile_offline_parents";

// ==========================================
// 2. Tipe Data Antrean Mutasi Offline Terpadu
// ==========================================
export type OfflineMutation =
  | {
    id: string;
    type: "measurement";
    data: OfflineQueueItem;
    createdAt: string;
  }
  | {
    id: string;
    type: "create_child";
    data: ChildFormData & { temp_id?: string; relationship?: "ayah" | "ibu" | "wali" };
    createdAt: string;
  }
  | {
    id: string;
    type: "update_child";
    childId: string;
    data: ChildFormData;
    createdAt: string;
  }
  | {
    id: string;
    type: "delete_child";
    childId: string;
    childName: string;
    createdAt: string;
  };

export type OfflineMutationInput =
  | {
    type: "measurement";
    data: OfflineQueueItem;
  }
  | {
    type: "create_child";
    data: ChildFormData & { temp_id?: string; relationship?: "ayah" | "ibu" | "wali" };
  }
  | {
    type: "update_child";
    childId: string;
    data: ChildFormData;
  }
  | {
    type: "delete_child";
    childId: string;
    childName: string;
  };

// ==========================================
// 3. User & Entity Cache Types
// ==========================================
export interface CachedUserInfo {
  id?: string;
  role?: string;
  email?: string;
  fullName?: string;
  cachedAt: string;
}

export interface CachedParent {
  id: string;
  full_name: string | null;
  role?: string;
  created_at?: string;
}

function notifyQueueChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("gizismile-queue-updated"));
  }
}

function safeGetItem<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`Gagal membaca ${key} dari localStorage:`, err);
    return defaultValue;
  }
}

function safeSetItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Gagal menyimpan ${key} ke localStorage:`, err);
  }
}

// ==========================================
// 4. Unified Mutation Queue Functions
// ==========================================
export function getUnifiedOfflineQueue(): OfflineMutation[] {
  return safeGetItem<OfflineMutation[]>(OFFLINE_UNIFIED_QUEUE_KEY, []);
}

export function enqueueOfflineMutation(
  mutation: OfflineMutationInput,
): OfflineMutation {
  if (typeof window === "undefined") {
    throw new Error("Penyimpanan offline hanya tersedia di peramban");
  }

  const queue = getUnifiedOfflineQueue();
  const newEntry = {
    ...mutation,
    id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  } as OfflineMutation;

  const updated = [...queue, newEntry];
  safeSetItem(OFFLINE_UNIFIED_QUEUE_KEY, updated);

  // Jika ini mutasi pengukuran, sinkronkan juga ke antrean lama agar backwards-compatible
  if (newEntry.type === "measurement") {
    const legacyQueue = getOfflineQueue();
    safeSetItem(OFFLINE_QUEUE_KEY, [...legacyQueue, newEntry.data]);
  }

  notifyQueueChange();
  return newEntry;
}

export function removeOfflineMutation(id: string): void {
  const queue = getUnifiedOfflineQueue();
  const target = queue.find((m) => m.id === id);
  const updated = queue.filter((m) => m.id !== id);
  safeSetItem(OFFLINE_UNIFIED_QUEUE_KEY, updated);

  if (target && target.type === "measurement") {
    removeFromOfflineQueue(target.data.local_id);
  }

  notifyQueueChange();
}

export function clearUnifiedOfflineQueue(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(OFFLINE_UNIFIED_QUEUE_KEY);
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
  notifyQueueChange();
}

export function getUnifiedQueueCount(): number {
  return getUnifiedOfflineQueue().length;
}

// ==========================================
// 5. Backward Compatibility untuk Measurements
// ==========================================
export function getOfflineQueue(): OfflineQueueItem[] {
  return safeGetItem<OfflineQueueItem[]>(OFFLINE_QUEUE_KEY, []);
}

export function addToOfflineQueue(
  item: Omit<OfflineQueueItem, "local_id" | "queued_at">,
): OfflineQueueItem {
  const newItem: OfflineQueueItem = {
    ...item,
    local_id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    queued_at: new Date().toISOString(),
  };

  enqueueOfflineMutation({
    type: "measurement",
    data: newItem,
  });

  return newItem;
}

export function removeFromOfflineQueue(localId: string): void {
  if (typeof window === "undefined") return;
  const queue = getOfflineQueue();
  const updated = queue.filter((item) => item.local_id !== localId);
  safeSetItem(OFFLINE_QUEUE_KEY, updated);

  // Bersihkan juga dari unified jika ada
  const unified = getUnifiedOfflineQueue();
  const filteredUnified = unified.filter(
    (m) => !(m.type === "measurement" && m.data.local_id === localId),
  );
  if (filteredUnified.length !== unified.length) {
    safeSetItem(OFFLINE_UNIFIED_QUEUE_KEY, filteredUnified);
  }

  notifyQueueChange();
}

export function clearOfflineQueue(): void {
  clearUnifiedOfflineQueue();
}

export function getQueueCount(): number {
  const unified = getUnifiedQueueCount();
  const legacy = getOfflineQueue().length;
  return Math.max(unified, legacy);
}

// ==========================================
// 6. User Info & Entity Pre-Cache Helpers
// ==========================================
export function getCachedUser(): CachedUserInfo | null {
  return safeGetItem<CachedUserInfo | null>(CACHE_USER_KEY, null);
}

export function setCachedUser(info: Omit<CachedUserInfo, "cachedAt">): void {
  safeSetItem(CACHE_USER_KEY, { ...info, cachedAt: new Date().toISOString() });
}

export function getCachedChildren(): ChildWithLatestMeasurement[] {
  return safeGetItem<ChildWithLatestMeasurement[]>(CACHE_CHILDREN_KEY, []);
}

export function setCachedChildren(children: ChildWithLatestMeasurement[]): void {
  safeSetItem(CACHE_CHILDREN_KEY, children);
}

export function getCachedParents(): CachedParent[] {
  return safeGetItem<CachedParent[]>(OFFLINE_PARENTS_KEY, []);
}

export function setCachedParents(parents: CachedParent[]): void {
  safeSetItem(OFFLINE_PARENTS_KEY, parents);
}

export function getCachedRecipes(): SmartRecipe[] {
  return safeGetItem<SmartRecipe[]>(CACHE_RECIPES_KEY, []);
}

export function setCachedRecipes(recipes: SmartRecipe[]): void {
  safeSetItem(CACHE_RECIPES_KEY, recipes);
}

export function getCachedCommodities(): CommodityWithNutrition[] {
  return safeGetItem<CommodityWithNutrition[]>(CACHE_COMMODITIES_KEY, []);
}

export function setCachedCommodities(commodities: CommodityWithNutrition[]): void {
  safeSetItem(CACHE_COMMODITIES_KEY, commodities);
}

// ==========================================
// 7. Bersihkan Seluruh Cache Pengguna saat Logout
// ==========================================
export function clearAllOfflineStorage(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(OFFLINE_UNIFIED_QUEUE_KEY);
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
  localStorage.removeItem(CACHE_USER_KEY);
  localStorage.removeItem(CACHE_CHILDREN_KEY);
  localStorage.removeItem(OFFLINE_PARENTS_KEY);
  localStorage.removeItem(CACHE_RECIPES_KEY);
  localStorage.removeItem(CACHE_COMMODITIES_KEY);
  notifyQueueChange();
}
