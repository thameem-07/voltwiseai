import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db-store";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    let vehicle = session ? dbStore.getVehicles(session.userId)[0] : undefined;

    if (!vehicle) {
      vehicle = dbStore.getVehicles()[0];
    }

    return NextResponse.json({
      success: true,
      vehicle,
    });
  } catch (error) {
    console.error("GET /api/vehicle error:", error);
    return NextResponse.json({ error: "Failed to fetch vehicle" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      vehicleId,
      batteryPercentage,
      estimatedRangeKm,
      latitude,
      longitude,
      chargingStatus,
      connectionMode,
      make,
      model,
      year,
      batteryCapacityKwh,
      connectorType,
    } = body;

    let targetId = vehicleId;
    if (!targetId) {
      const session = await getSession();
      const v = session ? dbStore.getVehicles(session.userId)[0] : dbStore.getVehicles()[0];
      targetId = v?.id;
    }

    if (!targetId) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (make !== undefined) updates.make = make;
    if (model !== undefined) updates.model = model;
    if (year !== undefined) updates.year = Number(year);
    if (batteryCapacityKwh !== undefined) updates.batteryCapacityKwh = Number(batteryCapacityKwh);
    if (connectorType !== undefined) updates.connectorType = connectorType;

    if (batteryPercentage !== undefined) {
      const num = Math.max(0, Math.min(100, Number(batteryPercentage)));
      updates.currentBatteryPercentage = num;
      // Auto-update estimated range if not provided
      if (estimatedRangeKm === undefined) {
        updates.estimatedRangeKm = Math.round((num / 100) * 340);
      }
    }
    if (estimatedRangeKm !== undefined) updates.estimatedRangeKm = Number(estimatedRangeKm);
    if (latitude !== undefined) updates.currentLatitude = Number(latitude);
    if (longitude !== undefined) updates.currentLongitude = Number(longitude);
    if (chargingStatus !== undefined) updates.chargingStatus = chargingStatus;
    if (connectionMode !== undefined) updates.connectionMode = connectionMode;

    const updated = dbStore.updateVehicle(targetId, updates);

    // Auto-alert if battery <= 10
    if (updated && updated.currentBatteryPercentage <= 10) {
      dbStore.createNotification({
        userId: updated.userId,
        title: "🔴 CRITICAL BATTERY: Under 10%",
        message: `Your vehicle battery is at ${updated.currentBatteryPercentage}% (${updated.estimatedRangeKm} km). Reach nearest charger immediately.`,
        type: "BATTERY_WARNING",
      });
    }

    return NextResponse.json({ success: true, vehicle: updated });
  } catch (error) {
    console.error("PATCH /api/vehicle error:", error);
    return NextResponse.json({ error: "Failed to update vehicle" }, { status: 500 });
  }
}
