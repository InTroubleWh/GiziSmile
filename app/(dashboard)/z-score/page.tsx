import { Suspense } from "react";
import { connection } from "next/server";
import { getChildren } from "@/actions/children";
import { ZScoreForm } from "@/components/z-score/ZScoreForm";
import { Sparkles, Info } from "lucide-react";

export const metadata = {
  title: "Kalkulator Z-Score WHO — GiziSmile",
  description: "Pengukuran antropometri balita dan visualisasi kurva pertumbuhan baku WHO.",
};

async function ZScoreContent() {
  await connection();
  const { data: childrenData } = await getChildren();

  const formattedChildren =
    childrenData && childrenData.length > 0
      ? childrenData.map((c) => {
        const sorted = c.measurements && c.measurements.length > 0
          ? [...c.measurements].sort(
            (a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime()
          )
          : [];
        const latest = sorted[0];

        return {
          id: c.id,
          name: `${c.name} (${c.region || "Posyandu"})`,
          gender: c.gender,
          birth_date: c.birth_date,
          latest_measurement: latest
            ? {
              age_months: latest.age_months,
              height_cm: latest.height_cm,
              weight_kg: latest.weight_kg,
              measured_at: latest.measured_at,
            }
            : undefined,
        };
      })
      : [];

  return <ZScoreForm childrenList={formattedChildren} />;
}

export default function ZScorePage() {
  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            Kalkulator Z-Score Antropometri Balita
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Standar Baku Baku Mutu Pertumbuhan WHO Child Growth Standards (TB/U, BB/U, BB/TB)
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md border w-fit">
          <Info className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>Mendukung simpan luring & pratinjau seketika</span>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="h-64 flex items-center justify-center text-xs text-muted-foreground animate-pulse border rounded-lg bg-muted/20">
            Memuat Formulir Antropometri & Kurva WHO...
          </div>
        }
      >
        <ZScoreContent />
      </Suspense>
    </div>
  );
}
