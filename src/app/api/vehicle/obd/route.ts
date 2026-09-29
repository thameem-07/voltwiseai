import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db-store";
import { obdBridgeService } from "@/services/vehicle/obd-service";

export async function GET() {
  try {
    const vehicle = dbStore.getVehicles()[0];
    const soc = vehicle ? vehicle.currentBatteryPercentage : 45;
    const isCharging = vehicle?.chargingStatus === "CHARGING";

    const packet = obdBridgeService.generateTelemetryPacket(soc, isCharging);
    const dtcs = obdBridgeService.getDiagnosticTroubleCodes();

    return NextResponse.json({
      success: true,
      packet,
      diagnostics: dtcs,
    });
  } catch (error) {
    console.error("GET /api/vehicle/obd error:", error);
    return NextResponse.json({ error: "Failed to read OBD stream" }, { status: 500 });
  }
}
