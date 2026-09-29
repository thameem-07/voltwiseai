import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db-store";
import { planEvRoute } from "@/services/intelligence/route-engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { destination, origin, waypoints = [], vehicleId } = body;

    if (!destination || !destination.lat || !destination.lng) {
      return NextResponse.json({ error: "Destination coordinates required" }, { status: 400 });
    }

    const baseVehicle = vehicleId ? dbStore.getVehicleById(vehicleId) : dbStore.getVehicles()[0];
    if (!baseVehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const vehicle = {
      ...baseVehicle,
      ...(body.batteryPercentage !== undefined && Number.isFinite(body.batteryPercentage)
        ? { currentBatteryPercentage: Math.max(1, Math.min(100, body.batteryPercentage)) }
        : {}),
    };

    const startPoint = origin || {
      lat: vehicle.currentLatitude,
      lng: vehicle.currentLongitude,
      label: "Current Vehicle Location",
    };

    const stations = dbStore.getStations();
    const chargers = dbStore.getChargers();
    const prices = dbStore.getPrices();

    const plan = await planEvRoute(vehicle, startPoint, destination, stations, chargers, prices, waypoints);
    if (!plan) {
      return NextResponse.json(
        { success: false, error: "Route unavailable. Try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      route: plan,
    });
  } catch (error) {
    console.error("POST /api/route error:", error);
    return NextResponse.json({ error: "Failed to calculate route" }, { status: 500 });
  }
}
