import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db-store";
import { stationCache } from "@/services/charging/station-cache";

export async function POST() {
  try {
    dbStore.resetToSeed();
    stationCache.clear();
    return NextResponse.json({
      success: true,
      message: "Database and charging station cache reset.",
    });
  } catch (error) {
    console.error("POST /api/demo/reset error:", error);
    return NextResponse.json({ error: "Failed to reset demo state" }, { status: 500 });
  }
}
