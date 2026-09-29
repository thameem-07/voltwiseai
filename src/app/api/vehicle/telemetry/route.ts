import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db-store";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get("vehicleId") || dbStore.getVehicles()[0]?.id;

    if (!vehicleId) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const telemetry = dbStore.getTelemetry(vehicleId);
    return NextResponse.json({ success: true, count: telemetry.length, telemetry });
  } catch (error) {
    console.error("GET /api/vehicle/telemetry error:", error);
    return NextResponse.json({ error: "Failed to fetch telemetry" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { vehicleId, batteryPercentage, estimatedRangeKm, latitude, longitude, chargingStatus, source } = body;

    const targetVehicle = vehicleId ? dbStore.getVehicleById(vehicleId) : dbStore.getVehicles()[0];
    if (!targetVehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const item = dbStore.addTelemetry({
      vehicleId: targetVehicle.id,
      batteryPercentage: Number(batteryPercentage ?? targetVehicle.currentBatteryPercentage),
      estimatedRangeKm: Number(estimatedRangeKm ?? targetVehicle.estimatedRangeKm),
      latitude: Number(latitude ?? targetVehicle.currentLatitude),
      longitude: Number(longitude ?? targetVehicle.currentLongitude),
      chargingStatus: chargingStatus ?? targetVehicle.chargingStatus,
      chargingPowerKw: chargingStatus === "CHARGING" ? 60 : 0,
      source: source || targetVehicle.connectionMode,
    });

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error("POST /api/vehicle/telemetry error:", error);
    return NextResponse.json({ error: "Failed to record telemetry" }, { status: 500 });
  }
}
