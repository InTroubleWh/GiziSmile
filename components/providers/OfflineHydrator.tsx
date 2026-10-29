"use client";

import { useEffect, useRef } from "react";
import {
  setCachedUser,
  setCachedChildren,
  setCachedRecipes,
  setCachedCommodities,
  setCachedParents,
  getUnifiedOfflineQueue,
  removeOfflineMutation,
} from "@/lib/offline";
import { processOfflineMutations } from "@/actions/sync";
import type { ChildWithLatestMeasurement } from "@/actions/children";
import type { SmartRecipe } from "@/lib/recipe-engine";
import type { CommodityWithNutrition } from "@/actions/recipes";
import type { CachedParent } from "@/lib/offline";

interface OfflineHydratorProps {
  userRole?: string;
  userEmail?: string;
  userFullName?: string;
  initialChildren?: ChildWithLatestMeasurement[];
  initialRecipes?: SmartRecipe[];
  initialCommodities?: CommodityWithNutrition[];
  initialParents?: CachedParent[];
}

export function OfflineHydrator({
  userRole,
  userEmail,
  userFullName,
  initialChildren,
  initialRecipes,
  initialCommodities,
  initialParents,
}: OfflineHydratorProps) {
  const isSyncingRef = useRef(false);

  // 1. Simpan dan perbarui cache pengguna saat render pertama / ada update
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (userEmail || userRole || userFullName) {
      setCachedUser({
        role: userRole,
        email: userEmail,
        fullName: userFullName,
      });
    }

    if (initialChildren && initialChildren.length > 0) {
      setCachedChildren(initialChildren);
    }

    if (initialRecipes && initialRecipes.length > 0) {
      setCachedRecipes(initialRecipes);
    }

    if (initialCommodities && initialCommodities.length > 0) {
      setCachedCommodities(initialCommodities);
    }

    if (initialParents && initialParents.length > 0) {
      setCachedParents(initialParents);
    }
  }, [
    userRole,
    userEmail,
    userFullName,
    initialChildren,
    initialRecipes,
    initialCommodities,
    initialParents,
  ]);

  // 2. Auto-sync background saat koneksi online terdeteksi
  useEffect(() => {
    if (typeof window === "undefined") return;

    const attemptAutoSync = async () => {
      if (isSyncingRef.current || !navigator.onLine) return;

      const queue = getUnifiedOfflineQueue();
      if (queue.length === 0) return;

      isSyncingRef.current = true;
      try {
        const res = await processOfflineMutations(queue);
        if (res.processedIds.length > 0) {
          for (const id of res.processedIds) {
            removeOfflineMutation(id);
          }
        }
      } catch (err) {
        console.warn("Auto-sync background error:", err);
      } finally {
        isSyncingRef.current = false;
      }
    };

    window.addEventListener("online", attemptAutoSync);

    // Coba sync saat mount jika online
    if (navigator.onLine) {
      attemptAutoSync();
    }

    return () => {
      window.removeEventListener("online", attemptAutoSync);
    };
  }, []);

  return null;
}
