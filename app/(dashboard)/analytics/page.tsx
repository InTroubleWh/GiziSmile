import { Suspense } from "react";
import { connection } from "next/server";
import { getChildren } from "@/actions/children";
import { RegionChart, RegionAggregate } from "@/components/analytics/RegionChart";
import { BarChart3, Building2 } from "lucide-react";

export const metadata = {
  title: "Analitik Stunting Wilayah — GiziSmile",
  description: "Visualisasi agregasi kasus stunting per wilayah dan fasilitas cetak laporan posyandu.",
};

async function AnalyticsContent() {
  await connection();
  const { data: childrenData } = await getChildren();

  // Agregasi kasus per wilayah
  const regionMap = new Map<string, { total: number; stunting: number; normal: number }>();

  if (childrenData && childrenData.length > 0) {
    for (const child of childrenData) {
      const region = child.region || "Wilayah Posyandu";
      const measurements = child.measurements || [];
      const latest = measurements.length > 0 ? measurements[measurements.length - 1] : null;

      const isStunted = latest ? (latest.zscore_hfa ?? 0) < -2 : false;

      const current = regionMap.get(region) || { total: 0, stunting: 0, normal: 0 };
      current.total += 1;
      if (isStunted) {
        current.stunting += 1;
      } else {
        current.normal += 1;
      }
      regionMap.set(region, current);
    }
  }

  const aggregatedData: RegionAggregate[] = Array.from(regionMap.entries()).map(
    ([region, counts]) => ({
      region,
      total: counts.total,
      stunting: counts.stunting,
      normal: counts.normal,
      prevalence: counts.total > 0 ? Number(((counts.stunting / counts.total) * 100).toFixed(1)) : 0,
    }),
  );

  return <RegionChart data={aggregatedData.length > 0 ? aggregatedData : undefined} />;
}

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            Dashboard Analitik Sebaran Stunting Wilayah
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Data pemantauan agregat tingkat desa/wilayah kerja Puskesmas &amp; Posyandu.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md border w-fit">
          <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>Fasilitas Pelaporan Resmi Puskesmas</span>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="h-64 flex items-center justify-center text-xs text-muted-foreground animate-pulse border rounded-lg bg-muted/20">
            Menganalisis Sebaran Data Stunting Wilayah...
          </div>
        }
      >
        <AnalyticsContent />
      </Suspense>
    </div>
  );
}
