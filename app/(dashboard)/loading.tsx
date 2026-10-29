export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Skeleton Header Halaman */}
      <div className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-muted rounded-md" />
          <div className="h-4 w-96 max-w-full bg-muted/60 rounded-md" />
        </div>
        <div className="h-8 w-44 bg-muted/50 rounded-md" />
      </div>

      {/* Skeleton Kartu Metrik / Ringkasan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 rounded-xl border bg-card space-y-3">
            <div className="h-3 w-28 bg-muted rounded" />
            <div className="h-7 w-16 bg-muted rounded" />
            <div className="h-3 w-36 bg-muted/60 rounded" />
          </div>
        ))}
      </div>

      {/* Skeleton Konten Utama (Form / Grafik) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 p-5 rounded-xl border bg-card space-y-4">
          <div className="h-5 w-48 bg-muted rounded" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-24 bg-muted/80 rounded" />
                <div className="h-9 w-full bg-muted/40 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <div className="p-5 rounded-xl border bg-card space-y-4">
            <div className="h-5 w-56 bg-muted rounded" />
            <div className="h-[280px] w-full bg-muted/30 rounded-lg flex items-center justify-center">
              <span className="text-xs text-muted-foreground/60">Menyiapkan visualisasi data...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
