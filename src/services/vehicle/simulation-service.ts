import { dbStore } from "@/lib/db-store";
import { Vehicle } from "@/types";

export interface SimulationState {
  batteryPercentage: number;
  estimatedRangeKm: number;
  latitude: number;
  longitude: number;
  chargingStatus: Vehicle["chargingStatus"];
  connectionMode: Vehicle["connectionMode"];
  drainRatePerMin: number;
}

export class SimulationService {
  setPreset(vehicleId: string, preset: "CRITICAL_10" | "LOW_25" | "NORMAL_50" | "HIGH_80"): Vehicle | null {
    let battery = 50;
    let range = 180;

    switch (preset) {
      case "CRITICAL_10":
        battery = 9;
        range = 28;
        break;
      case "LOW_25":
        battery = 25;
        range = 85;
        break;
      case "NORMAL_50":
        battery = 50;
        range = 175;
        break;
      case "HIGH_80":
        battery = 80;
        range = 280;
        break;
    }

    const updated = dbStore.updateVehicle(vehicleId, {
      currentBatteryPercentage: battery,
      estimatedRangeKm: range,
      connectionMode: "SIMULATION",
    });

    if (updated && battery <= 10) {
      dbStore.createNotification({
        userId: updated.userId,
        title: "Critical Battery Alert (9%)",
        message: "State of charge critical. Urgent charging required to prevent stranding.",
        type: "BATTERY_WARNING",
      });
    }

    return updated;
  }

  updateTelemetry(
    vehicleId: string,
    updates: {
      batteryPercentage?: number;
      estimatedRangeKm?: number;
      latitude?: number;
      longitude?: number;
      chargingStatus?: Vehicle["chargingStatus"];
      connectionMode?: Vehicle["connectionMode"];
    }
  ): Vehicle | null {
    return dbStore.updateVehicle(vehicleId, {
      ...updates,
      connectionMode: updates.connectionMode || "SIMULATION",
    });
  }
}

export const simulationService = new SimulationService();
