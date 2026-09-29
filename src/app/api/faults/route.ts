import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db-store";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const faults = dbStore.getFaultReports();
    const stations = dbStore.getStations();
    const chargers = dbStore.getChargers();

    const enriched = faults.map((f) => {
      const station = stations.find((s) => s.id === f.stationId);
      const charger = chargers.find((c) => c.id === f.chargerId);
      return {
        ...f,
        stationName: station?.name || "Unknown Station",
        evseId: charger?.evseId,
      };
    });

    return NextResponse.json({ success: true, count: enriched.length, faults: enriched });
  } catch (error) {
    console.error("GET /api/faults error:", error);
    return NextResponse.json({ error: "Failed to fetch fault reports" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json();
    const { stationId, chargerId, category, description, severity = "MEDIUM" } = body;

    if (!stationId || !category || !description) {
      return NextResponse.json({ error: "Station, category, and description are required" }, { status: 400 });
    }

    const report = dbStore.createFaultReport({
      userId: session?.userId || "usr_driver_01",
      stationId,
      chargerId: chargerId || undefined,
      category,
      description,
      severity,
      status: "PENDING",
    });

    return NextResponse.json({
      success: true,
      report,
      message: "Fault report submitted successfully to CPO operations.",
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/faults error:", error);
    return NextResponse.json({ error: "Failed to submit fault report" }, { status: 500 });
  }
}
