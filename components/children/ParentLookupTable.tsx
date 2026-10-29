"use client";

import { useState, useMemo } from "react";
import { Search, UserCheck, X, Users, Check, WifiOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CachedParent } from "@/lib/offline";

interface ParentLookupTableProps {
  parents: CachedParent[];
  selectedParentId?: string;
  selectedRelationship?: "ayah" | "ibu" | "wali";
  onSelect: (parentId: string, relationship: "ayah" | "ibu" | "wali") => void;
  onClear: () => void;
  isOffline?: boolean;
}

export function ParentLookupTable({
  parents = [],
  selectedParentId,
  selectedRelationship = "ibu",
  onSelect,
  onClear,
  isOffline = false,
}: ParentLookupTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [tempRelationship, setTempRelationship] = useState<"ayah" | "ibu" | "wali">(
    selectedRelationship || "ibu"
  );

  const selectedParent = useMemo(() => {
    return parents.find((p) => p.id === selectedParentId);
  }, [parents, selectedParentId]);

  const filteredParents = useMemo(() => {
    if (!searchQuery.trim()) return parents;
    const q = searchQuery.toLowerCase();
    return parents.filter(
      (p) =>
        (p.full_name && p.full_name.toLowerCase().includes(q)) ||
        p.id.toLowerCase().includes(q)
    );
  }, [parents, searchQuery]);

  return (
    <div className="space-y-3 p-3 rounded-lg border bg-card/60">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-primary" />
            Tautkan Akun Orang Tua (Opsional)
          </label>
          <p className="text-[11px] text-muted-foreground">
            Hubungkan balita ke akun orang tua agar data dapat dipantau langsung dari dashboard orang tua.
          </p>
        </div>

        {isOffline && (
          <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 dark:text-amber-400 border-amber-500/30 w-fit">
            <WifiOff className="w-3 h-3" />
            Cache Luring (Tersimpan Lokal)
          </Badge>
        )}
      </div>

      {/* Jika Orang Tua Sudah Terpilih */}
      {selectedParent ? (
        <div className="p-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-foreground">
                  {selectedParent.full_name || "Tanpa Nama"}
                </span>
                <Badge className="bg-emerald-600 text-white text-[10px] capitalize px-1.5 py-0">
                  {selectedRelationship}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono">
                ID: {selectedParent.id.substring(0, 13)}...
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedRelationship}
              onChange={(e) => onSelect(selectedParent.id, e.target.value as "ayah" | "ibu" | "wali")}
              className="h-7 text-xs px-2 rounded border bg-background text-foreground"
            >
              <option value="ibu">Sebagai Ibu</option>
              <option value="ayah">Sebagai Ayah</option>
              <option value="wali">Sebagai Wali</option>
            </select>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Lepas
            </Button>
          </div>
        </div>
      ) : (
        /* Tabel & Bar Pencarian untuk Memilih Orang Tua */
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari nama orang tua terdaftar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <select
              value={tempRelationship}
              onChange={(e) => setTempRelationship(e.target.value as "ayah" | "ibu" | "wali")}
              className="h-8 text-xs px-2.5 rounded-md border bg-background text-foreground shrink-0"
              title="Hubungan keluarga saat memilih baris"
            >
              <option value="ibu">Ibu</option>
              <option value="ayah">Ayah</option>
              <option value="wali">Wali</option>
            </select>
          </div>

          {/* Tabel Mini Hasil Pencarian */}
          <div className="border rounded-md max-h-40 overflow-y-auto bg-background/50 text-xs">
            {filteredParents.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-[11px]">
                {parents.length === 0
                  ? "Belum ada akun orang tua yang terdaftar di sistem."
                  : `Tidak ditemukan orang tua dengan kata kunci "${searchQuery}".`}
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-muted/40 sticky top-0 text-[10px] text-muted-foreground uppercase border-b">
                  <tr>
                    <th className="py-1.5 px-3 font-semibold">Nama Lengkap Orang Tua</th>
                    <th className="py-1.5 px-2 font-semibold">Peran</th>
                    <th className="py-1.5 px-3 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredParents.map((parent) => {
                    const isRowSelected = parent.id === selectedParentId;
                    return (
                      <tr
                        key={parent.id}
                        className={`hover:bg-muted/30 transition-colors ${
                          isRowSelected ? "bg-emerald-500/10 font-medium" : ""
                        }`}
                      >
                        <td className="py-2 px-3 text-foreground">
                          {parent.full_name || "Tanpa Nama"}
                        </td>
                        <td className="py-2 px-2">
                          <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                            parent
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant={isRowSelected ? "default" : "outline"}
                            className="h-6 px-2 text-[11px] gap-1"
                            onClick={() => onSelect(parent.id, tempRelationship)}
                          >
                            {isRowSelected ? (
                              <>
                                <Check className="w-3 h-3 text-white" />
                                Terpilih
                              </>
                            ) : (
                              "Pilih"
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground italic">
            * Pilih baris orang tua untuk menghubungkan balita dengan status ({tempRelationship.toUpperCase()}).
          </p>
        </div>
      )}
    </div>
  );
}
