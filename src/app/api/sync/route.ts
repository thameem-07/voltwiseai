import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db-store";
import { stationSyncService } from "@/services/charging/station-sync-service";
import { StationSource } from "@/types";

export async function GET() {
  try {
    const logs = dbStore.getSyncLogs();
    const stations = dbStore.getStations();

    const sourceStats = {
      OPEN_CHARGE_MAP: {
        lastSync: logs.find((l) => l.source === "OPEN_CHARGE_MAP")?.completedAt || null,
        status: logs.find((l) => l.source === "OPEN_CHARGE_MAP")?.status || "SUCCESS",
        stationCount: stations.filter((s) => s.source === "OPEN_CHARGE_MAP").length,
      },
      BEE: {
        lastSync: logs.find((l) => l.source === "BEE")?.completedAt || null,
        status: logs.find((l) => l.source === "BEE")?.status || "SUCCESS",
        stationCount: stations.filter((s) => s.source === "BEE").length,
      },
      OCPI: {
        lastSync: logs.find((l) => l.source === "OCPI")?.completedAt || null,
        status: logs.find((l) => l.source === "OCPI")?.status || "SUCCESS",
        stationCount: stations.filter((s) => s.source === "OCPI").length,
      },
    };

    return NextResponse.json({
      success: true,
      sourceStats,
      logs: logs.slice(0, 15),
    });
  } catch (error) {
    console.error("GET /api/sync error:", error);
    return NextResponse.json({ error: "Failed to fetch sync status" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const source = (body.source || "ALL") as StationSource | "ALL";

    if (source === "ALL") {
      const results = await stationSyncService.syncAllSources();
      return NextResponse.json({
        success: true,
        message: "Synchronized all data sources successfully",
        results,
      });
    }

    const result = await stationSyncService.syncSource(source);
    return NextResponse.json({
      success: true,
      message: `Synchronized ${source} successfully`,
      result,
    });
  } catch (error) {
    console.error("POST /api/sync error:", error);
    return NextResponse.json({ error: "Failed to trigger sync" }, { status: 500 });
  }
}
