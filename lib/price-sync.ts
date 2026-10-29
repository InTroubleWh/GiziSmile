import { createAdminClient } from "@/lib/supabase/admin";

export interface ExternalCommodityItem {
  id: string;
  nama: string;
  satuan: string;
}

export interface ExternalPriceEntry {
  wilayah: {
    level: "provinsi" | "kabupaten_kota";
    nama: string;
    provinsi: string | null;
  };
  harga: number;
}

export interface ExternalCommodityData {
  komoditas: ExternalCommodityItem;
  harga: ExternalPriceEntry[];
}

export interface ExternalLatestPricesResponse {
  sumber: string;
  tanggal_update: string;
  disclaimer: string;
  tanggal: string | null;
  data: ExternalCommodityData[];
}

/**
 * Mapping configuration between external commodities and internal GiziSmile commodities.
 */
interface CommodityMappingRule {
  targetCommodityId: string;
  unitMultiplier: number; // e.g. eggs from kg to butir
  // Matchers can match by external komoditas.id or partial match on external komoditas.nama
  matcher: (komoditas: ExternalCommodityItem) => boolean;
}

const COMMODITY_MAPPING_RULES: CommodityMappingRule[] = [
  // 1. Beras Medium -> com_beras
  {
    targetCommodityId: "com_beras",
    unitMultiplier: 1,
    matcher: (k) =>
      k.id === "com_3" ||
      k.id === "com_4" ||
      (k.nama.toLowerCase().includes("beras") && k.nama.toLowerCase().includes("medium")),
  },
  // 2. Daging Ayam Ras -> com_ayam
  {
    targetCommodityId: "com_ayam",
    unitMultiplier: 1,
    matcher: (k) =>
      k.id === "com_7" ||
      (k.nama.toLowerCase().includes("daging ayam") && k.nama.toLowerCase().includes("ras")),
  },
  // 3. Telur Ayam Ras -> com_telur (API provides in kg, GiziSmile uses 'butir' ~ 16 butir/kg or 62g each)
  {
    targetCommodityId: "com_telur",
    unitMultiplier: 1 / 16, // Convert per kg to per butir
    matcher: (k) =>
      k.nama.toLowerCase().includes("telur ayam") && k.nama.toLowerCase().includes("ras"),
  },
  // 4. Daging Sapi Segar -> com_daging_sapi
  {
    targetCommodityId: "com_daging_sapi",
    unitMultiplier: 1,
    matcher: (k) =>
      k.nama.toLowerCase().includes("daging sapi") &&
      (k.nama.toLowerCase().includes("kualitas") || k.nama.toLowerCase().includes("segar")),
  },
  // 5. Cabai Merah Keriting -> com_cabai_merah
  {
    targetCommodityId: "com_cabai_merah",
    unitMultiplier: 1,
    matcher: (k) =>
      k.nama.toLowerCase().includes("cabai merah keriting") ||
      k.nama.toLowerCase().includes("cabe merah keriting"),
  },
  // 6. Bawang Merah -> com_bawang_merah
  {
    targetCommodityId: "com_bawang_merah",
    unitMultiplier: 1,
    matcher: (k) =>
      k.nama.toLowerCase().includes("bawang merah"),
  },
  // 7. Bawang Putih -> com_bawang_putih
  {
    targetCommodityId: "com_bawang_putih",
    unitMultiplier: 1,
    matcher: (k) =>
      k.nama.toLowerCase().includes("bawang putih"),
  },
  // 8. Minyak Goreng -> com_minyak
  {
    targetCommodityId: "com_minyak",
    unitMultiplier: 1,
    matcher: (k) =>
      k.nama.toLowerCase().includes("minyak goreng"),
  },
  // 9. Gula Pasir -> com_gula
  {
    targetCommodityId: "com_gula",
    unitMultiplier: 1,
    matcher: (k) =>
      k.nama.toLowerCase().includes("gula pasir"),
  },
];

export interface PriceSyncResultItem {
  commodity_id: string;
  source_name: string;
  raw_price: number;
  final_price: number;
  region: string;
}

export interface PriceSyncResponse {
  success: boolean;
  source: string;
  tanggal_api: string | null;
  recorded_at: string;
  updated_count: number;
  commodities: PriceSyncResultItem[];
  error?: string;
}

/**
 * Extracts the most representative price for a commodity from its regional prices array.
 * Prioritizes the target province (e.g. "Jawa Barat"). If not found, calculates national average.
 */
function extractRepresentativePrice(
  hargaList: ExternalPriceEntry[],
  preferredProvince: string
): { price: number; regionUsed: string } | null {
  if (!hargaList || hargaList.length === 0) return null;

  // 1. Look for preferred province at level 'provinsi'
  const provMatch = hargaList.find(
    (h) =>
      h.wilayah.level === "provinsi" &&
      h.wilayah.nama.toLowerCase() === preferredProvince.toLowerCase() &&
      h.harga > 0
  );
  if (provMatch) {
    return { price: provMatch.harga, regionUsed: `Provinsi ${provMatch.wilayah.nama}` };
  }

  // 2. Look for any kabupaten/kota inside that province
  const cityMatch = hargaList.find(
    (h) =>
      h.wilayah.provinsi &&
      h.wilayah.provinsi.toLowerCase() === preferredProvince.toLowerCase() &&
      h.harga > 0
  );
  if (cityMatch) {
    return { price: cityMatch.harga, regionUsed: `${cityMatch.wilayah.nama} (${cityMatch.wilayah.provinsi})` };
  }

  // 3. Fallback: calculate national average across available province-level data
  const validProvincePrices = hargaList.filter(
    (h) => h.wilayah.level === "provinsi" && h.harga > 0
  );

  const pricesToAverage = validProvincePrices.length > 0 ? validProvincePrices : hargaList.filter((h) => h.harga > 0);
  if (pricesToAverage.length === 0) return null;

  const sum = pricesToAverage.reduce((acc, curr) => acc + curr.harga, 0);
  const avg = Math.round(sum / pricesToAverage.length);
  return { price: avg, regionUsed: "Rata-rata Nasional" };
}

/**
 * Main service to fetch latest prices from https://harga-pangan.fly.dev/ and update Supabase.
 */
export async function syncDailyPrices(): Promise<PriceSyncResponse> {
  const baseUrl = process.env.PRICE_API_BASE_URL || "https://harga-pangan.fly.dev";
  const preferredProvince = process.env.PRICE_DEFAULT_PROVINCE || "Jawa Barat";
  const apiUrl = `${baseUrl.replace(/\/+$/, "")}/harga/terbaru`;

  try {
    const res = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      // Ensure we don't use stale Next.js cache for the external API fetch
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`External API responded with status ${res.status}: ${res.statusText}`);
    }

    const payload: ExternalLatestPricesResponse = await res.json();
    if (!payload.data || !Array.isArray(payload.data)) {
      throw new Error("Invalid response format from price API: missing 'data' array");
    }

    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const recordedAt = payload.tanggal || todayStr;

    const matchedItems: PriceSyncResultItem[] = [];
    const processedCommodityIds = new Set<string>();

    for (const rule of COMMODITY_MAPPING_RULES) {
      if (processedCommodityIds.has(rule.targetCommodityId)) {
        continue;
      }

      // Find the first matching commodity in the payload
      const matchedData = payload.data.find((item) => rule.matcher(item.komoditas));
      if (!matchedData) continue;

      const representative = extractRepresentativePrice(matchedData.harga, preferredProvince);
      if (!representative) continue;

      const calculatedFinalPrice = Math.round(representative.price * rule.unitMultiplier);

      matchedItems.push({
        commodity_id: rule.targetCommodityId,
        source_name: matchedData.komoditas.nama,
        raw_price: representative.price,
        final_price: calculatedFinalPrice,
        region: representative.regionUsed,
      });

      processedCommodityIds.add(rule.targetCommodityId);
    }

    if (matchedItems.length === 0) {
      return {
        success: true,
        source: payload.sumber,
        tanggal_api: payload.tanggal,
        recorded_at: recordedAt,
        updated_count: 0,
        commodities: [],
      };
    }

    // Insert into Supabase daily_prices using the admin client
    const supabase = createAdminClient();

    const insertPayload = matchedItems.map((item) => ({
      commodity_id: item.commodity_id,
      price: item.final_price,
      recorded_at: recordedAt,
      source: "api" as const,
    }));

    const { error: dbError } = await supabase.from("daily_prices").insert(insertPayload);

    if (dbError) {
      throw new Error(`Supabase DB insert error: ${dbError.message}`);
    }

    return {
      success: true,
      source: payload.sumber,
      tanggal_api: payload.tanggal,
      recorded_at: recordedAt,
      updated_count: matchedItems.length,
      commodities: matchedItems,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Unknown error while syncing prices";
    console.error("[price-sync error]:", errMsg);
    return {
      success: false,
      source: "API Harga Pangan",
      tanggal_api: null,
      recorded_at: new Date().toISOString().split("T")[0],
      updated_count: 0,
      commodities: [],
      error: errMsg,
    };
  }
}
