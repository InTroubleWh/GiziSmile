import { NextRequest, NextResponse } from "next/server";
import { syncDailyPrices } from "@/lib/price-sync";

/**
 * Route handler executed by Vercel Cron (or manually by admin with Bearer token)
 * Path: GET /api/cron/update-prices
 */
export async function GET(request: NextRequest) {
  // 1. Verify authorization header from Vercel Cron or admin caller
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const expectedAuth = `Bearer ${cronSecret}`;
    if (authHeader !== expectedAuth) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing authorization token" },
        { status: 401 }
      );
    }
  } else if (process.env.NODE_ENV === "production") {
    // In production, CRON_SECRET must always be configured
    return NextResponse.json(
      { error: "Server misconfiguration: CRON_SECRET is not set" },
      { status: 500 }
    );
  }

  // 2. Perform price synchronization
  const result = await syncDailyPrices();

  if (!result.success) {
    return NextResponse.json(
      {
        message: "Failed to sync commodity prices",
        error: result.error,
        details: result,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      message: `Successfully synchronized ${result.updated_count} commodity prices`,
      data: result,
    },
    { status: 200 }
  );
}

