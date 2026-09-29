import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db-store";
import { getSession } from "@/lib/auth";
import { recommendBestStations } from "@/services/intelligence/recommendation-engine";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get("vehicleId");
    const destLatStr = searchParams.get("destLat");
    const destLngStr = searchParams.get("destLng");

    let vehicle = vehicleId ? dbStore.getVehicleById(vehicleId) : undefined;

    if (!vehicle) {
      const session = await getSession();
      if (session) {
        const userVehicles = dbStore.getVehicles(session.userId);
        if (userVehicles.length > 0) vehicle = userVehicles[0];
      }
    }

    if (!vehicle) {
      const allVehicles = dbStore.getVehicles();
      vehicle = allVehicles[0];
    }

    if (!vehicle) {
      return NextResponse.json({ error: "No vehicle available for recommendations" }, { status: 400 });
    }

    const stations = dbStore.getStations();
    const chargers = dbStore.getChargers();
    const prices = dbStore.getPrices();
    const queues = dbStore.getQueues();

    let destination: { lat: number; lng: number } | undefined;
    if (destLatStr && destLngStr) {
      destination = {
        lat: parseFloat(destLatStr),
        lng: parseFloat(destLngStr),
      };
    }

    const recommendations = recommendBestStations(
      vehicle,
      stations,
      chargers,
      prices,
      queues,
      destination
    );

    const topRecommendation = recommendations.find((r) => r.isRecommended) || recommendations[0];

    return NextResponse.json({
      success: true,
      vehicle: {
        id: vehicle.id,
        make: vehicle.make,
        model: vehicle.model,
        batteryPercentage: vehicle.currentBatteryPercentage,
        rangeKm: vehicle.estimatedRangeKm,
        connectorType: vehicle.connectorType,
        connectionMode: vehicle.connectionMode,
        latitude: vehicle.currentLatitude,
        longitude: vehicle.currentLongitude,
      },
      topRecommendation,
      recommendations,
    });
  } catch (error) {
    console.error("GET /api/recommendations error:", error);
    return NextResponse.json({ error: "Failed to generate recommendations" }, { status: 500 });
  }
}
