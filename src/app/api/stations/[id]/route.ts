import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db-store";
import { getSession } from "@/lib/auth";
import { calculateQueueMetrics } from "@/services/intelligence/queue-engine";
import { forecastHourlyDemand } from "@/services/intelligence/demand-engine";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const station = dbStore.getStationById(id);

    if (!station) {
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    }

    const chargers = dbStore.getChargers(id);
    const prices = dbStore.getPrices(id);
    const queues = dbStore.getQueues(id);
    const queueMetrics = calculateQueueMetrics(id, chargers, queues);
    const hourlyForecast = forecastHourlyDemand(station, chargers, queues);

    return NextResponse.json({
      success: true,
      station,
      chargers,
      price: prices[0] || null,
      queueMetrics,
      hourlyForecast,
    });
  } catch (error) {
    console.error("GET /api/stations/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch station details" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const updated = dbStore.updateStation(id, body);
    if (!updated) {
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, station: updated });
  } catch (error) {
    console.error("PATCH /api/stations/[id] error:", error);
    return NextResponse.json({ error: "Failed to update station" }, { status: 500 });
  }
}
