"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, TrendingDown, Users, AlertTriangle, ShieldCheck } from "lucide-react";

import { getCachedChildren } from "@/lib/offline";

export interface RegionAggregate {
  region: string;
  total: number;
  normal: number;
  stunting: number;
  prevalence: number; // Persentase %
}

interface RegionChartProps {
  data?: RegionAggregate[];
}

function computeFromCachedChildren(): RegionAggregate[] {
  if (typeof window === "undefined") return [];
  const cached = getCachedChildren();
  if (cached.length === 0) return [];

  const regionMap = new Map<string, { total: number; stunting: number; normal: number }>();
  for (const child of cached) {
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

  return Array.from(regionMap.entries()).map(([region, counts]) => ({
    region,
    total: counts.total,
    stunting: counts.stunting,
    normal: counts.normal,
    prevalence: counts.total > 0 ? Number(((counts.stunting / counts.total) * 100).toFixed(1)) : 0,
  }));
}

function RegionChartInner({ data }: RegionChartProps) {
  const chartData = useMemo(() => {
    if (data && data.length > 0) return data;
    const fromCache = computeFromCachedChildren();
    if (fromCache.length > 0) return fromCache;
    return [];
  }, [data]);

  const totalBalita = useMemo(() => chartData.reduce((acc, cur) => acc + cur.total, 0), [chartData]);
  const totalStunting = useMemo(() => chartData.reduce((acc, cur) => acc + cur.stunting, 0), [chartData]);
  const avgPrevalence = totalBalita > 0 ? ((totalStunting / totalBalita) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6">
      {/* Kartu Ringkasan KPI Wilayah */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Total Balita Terdata</span>
              <div className="text-2xl font-bold text-foreground">{totalBalita}</div>
              <span className="text-[11px] text-muted-foreground">di {chartData.length} wilayah binaan</span>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Kasus Stunting Teridentifikasi</span>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{totalStunting}</div>
              <span className="text-[11px] text-muted-foreground">Balita butuh intervensi</span>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Rata-Rata Prevalensi</span>
              <div className="text-2xl font-bold text-foreground">{avgPrevalence}%</div>
              <span className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                <TrendingDown className="w-3.5 h-3.5" /> Target RPJMN &lt; 14%
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600">
              <TrendingDown className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Kondisi Balita Normal</span>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {totalBalita - totalStunting}
              </div>
              <span className="text-[11px] text-muted-foreground">
                {totalBalita > 0 ? (((totalBalita - totalStunting) / totalBalita) * 100).toFixed(1) : 0}% dari populasi
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grafik Batang Perbandingan Antar Wilayah */}
      <Card className="border shadow-sm print:border-none print:shadow-none">
        <CardHeader className="pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              Sebaran Kasus Stunting Berdasarkan Wilayah
              <Badge variant="outline" className="text-xs font-normal">
                Kader Posyandu & Puskesmas
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Agregasi perbandingan balita status normal vs stunting (TB/U &lt; -2 SD)
            </CardDescription>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 print:hidden"
            onClick={() => window.print()}
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Laporan Wilayah
          </Button>
        </CardHeader>

        <CardContent className="pt-2">
          <div className="h-[340px] w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="region" tick={{ fontSize: 11 }} />
                <YAxis label={{ value: "Jumlah Balita", angle: -90, position: "insideLeft", fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload as RegionAggregate;
                      return (
                        <div className="bg-popover border p-2.5 rounded-md shadow-md text-xs space-y-1">
                          <div className="font-bold text-foreground">{d.region}</div>
                          <div className="text-emerald-600">Normal: {d.normal} anak</div>
                          <div className="text-red-500 font-medium">Stunting: {d.stunting} anak</div>
                          <div className="text-muted-foreground pt-1 border-t">
                            Prevalensi: <span className="font-bold text-foreground">{d.prevalence}%</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend verticalAlign="top" height={36} iconSize={10} />
                <Bar dataKey="normal" fill="#10b981" name="Balita Normal" radius={[4, 4, 0, 0]} />
                <Bar dataKey="stunting" fill="#ef4444" name="Indikasi Stunting (TB/U < -2 SD)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export const RegionChart = dynamic(() => Promise.resolve(RegionChartInner), {
  ssr: false,
  loading: () => (
    <div className="h-[380px] w-full rounded-lg border bg-muted/30 flex items-center justify-center text-xs text-muted-foreground animate-pulse">
      Memuat Grafik Analisis Wilayah...
    </div>
  ),
});
