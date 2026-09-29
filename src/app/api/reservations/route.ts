import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db-store";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all");

    // Admin can view all reservations, driver views their own
    let reservations = dbStore.getReservations();
    if (session && session.role !== "ADMIN" && !all) {
      reservations = reservations.filter((r) => r.userId === session.userId);
    }

    const stations = dbStore.getStations();
    const chargers = dbStore.getChargers();

    const enriched = reservations.map((res) => {
      const station = stations.find((s) => s.id === res.stationId);
      const charger = chargers.find((c) => c.id === res.chargerId);
      return {
        ...res,
        stationName: station?.name || "Unknown Station",
        stationAddress: station?.address,
        chargerPowerKw: charger?.powerKw || 60,
        connectorType: charger?.connectorType || "CCS2",
      };
    });

    return NextResponse.json({ success: true, count: enriched.length, reservations: enriched });
  } catch (error) {
    console.error("GET /api/reservations error:", error);
    return NextResponse.json({ error: "Failed to fetch reservations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json();
    const { stationId, chargerId, vehicleId, durationMinutes = 45 } = body;

    const userId = session?.userId || "usr_driver_01";
    const targetVehicleId = vehicleId || dbStore.getVehicles(userId)[0]?.id || dbStore.getVehicles()[0]?.id;

    if (!stationId || !chargerId) {
      return NextResponse.json({ error: "Station ID and Charger ID are required" }, { status: 400 });
    }

    // Check if charger is already occupied or reserved
    const charger = dbStore.getChargers().find((c) => c.id === chargerId);
    if (!charger) {
      return NextResponse.json({ error: "Charger not found" }, { status: 404 });
    }

    if (charger.status === "FAULTED" || charger.status === "OFFLINE") {
      return NextResponse.json({ error: "Charger is currently out of order or faulted" }, { status: 409 });
    }

    // Check active conflicting reservations
    const now = new Date();
    const startTime = now;
    const endTime = new Date(now.getTime() + durationMinutes * 60000);

    const conflicts = dbStore.getReservations().filter((r) => {
      if (r.chargerId !== chargerId) return false;
      if (r.status !== "CONFIRMED" && r.status !== "ACTIVE") return false;
      const rStart = new Date(r.reservationStart);
      const rEnd = new Date(r.reservationEnd);
      return startTime < rEnd && endTime > rStart;
    });

    if (conflicts.length > 0) {
      return NextResponse.json(
        { error: "Conflict: This charger has already been reserved during this time slot." },
        { status: 409 }
      );
    }

    // Estimate cost
    const price = dbStore.getPrices(stationId)[0] || { pricePerKwh: 18.5, sessionFee: 20 };
    const estimatedCost = Math.round(25 * price.pricePerKwh + price.sessionFee);

    const reservation = dbStore.createReservation({
      userId,
      vehicleId: targetVehicleId,
      stationId,
      chargerId,
      reservationStart: startTime.toISOString(),
      reservationEnd: endTime.toISOString(),
      status: "CONFIRMED",
      estimatedCost,
    });

    // Auto-create demo payment record
    const payment = dbStore.createPayment({
      userId,
      reservationId: reservation.id,
      amount: estimatedCost,
      currency: "INR",
      status: "SUCCESS",
      provider: "DEMO_PAY",
      mode: "DEMO",
    });

    return NextResponse.json({
      success: true,
      reservation,
      payment,
      message: "Charger reserved successfully! Valid for next 45 minutes.",
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/reservations error:", error);
    return NextResponse.json({ error: "Failed to create reservation" }, { status: 500 });
  }
}
