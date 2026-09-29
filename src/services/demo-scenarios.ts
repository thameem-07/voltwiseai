import { dbStore } from "@/lib/db-store";

export interface DemoScenarioDefinition {
  id: string;
  name: string;
  badge: string;
  description: string;
  expectedOutcome: string;
}

export const demoScenarios: DemoScenarioDefinition[] = [
  {
    id: "scenario-1",
    name: "Scenario 1: Critical Battery (9%)",
    badge: "🔴 Critical 9%",
    description: "Driver is stranded with 9% battery (28 km range). System triggers critical alerts and filters only reachable emergency stations.",
    expectedOutcome: "Immediate recommendation of the closest safe station with guaranteed reachability.",
  },
  {
    id: "scenario-2",
    name: "Scenario 2: Nearest Isn't Best",
    badge: "⚡ Smart vs Nearest",
    description: "Nearest station (Tata Guindy, 2 km) has a 30-min queue. Second station (Zeon EA, 5 km) has 120kW chargers open with 0 wait.",
    expectedOutcome: "System transparently recommends Station 2, saving 25+ minutes of total waiting time.",
  },
  {
    id: "scenario-3",
    name: "Scenario 3: Evening Rush Peak",
    badge: "🏙️ Peak Congestion",
    description: "City-wide peak demand between 17:00-20:00. Utilization rises to 85%+ across central commercial corridors.",
    expectedOutcome: "Demand prediction engine detects severe bottleneck and alerts drivers before queues form.",
  },
  {
    id: "scenario-4",
    name: "Scenario 4: Route Corridor Charging",
    badge: "🛣️ Long Distance",
    description: "Destination is beyond remaining battery range (75 km trip vs 48 km range).",
    expectedOutcome: "Automatic waypoint stop inserted at Shell Recharge OMR with charging time and cost calculated.",
  },
  {
    id: "scenario-5",
    name: "Scenario 5: Unsupported Vehicle Fallback",
    badge: "🔌 OBD-II Bridge",
    description: "Vehicle OEM cloud API is unsupported or offline for this vehicle model.",
    expectedOutcome: "System displays API unavailable and seamlessly switches to OBD-II CAN bridge telemetry streaming.",
  },
];

export function activateScenario(scenarioId: string): { success: boolean; message: string; scenario: DemoScenarioDefinition | undefined } {
  const scenario = demoScenarios.find((s) => s.id === scenarioId);
  const vehicles = dbStore.getVehicles();
  const vehicle = vehicles[0];

  if (!vehicle) {
    return { success: false, message: "No vehicle registered", scenario: undefined };
  }

  switch (scenarioId) {
    case "scenario-1": {
      // 9% critical battery
      dbStore.updateVehicle(vehicle.id, {
        currentBatteryPercentage: 9,
        estimatedRangeKm: 28,
        connectionMode: "SIMULATION",
        chargingStatus: "IDLE",
      });
      dbStore.createNotification({
        userId: vehicle.userId,
        title: "🔴 CRITICAL BATTERY: 9% Remaining",
        message: "Your vehicle has 28 km remaining. Charging stop required immediately.",
        type: "BATTERY_WARNING",
      });
      break;
    }

    case "scenario-2": {
      // Nearest isn't best
      // Make Tata Guindy (2km) congested with 4 waiting
      dbStore.setStationQueueCount("stn_tata_guindy", 4, 32);
      const tataChargers = dbStore.getChargers("stn_tata_guindy");
      tataChargers.forEach((c) => {
        dbStore.updateChargerStatus(c.id, "OCCUPIED");
      });

      // Make Zeon EA (5km) clear with 2 open 120kW chargers
      dbStore.setStationQueueCount("stn_zeon_ea", 0, 0);
      const eaChargers = dbStore.getChargers("stn_zeon_ea");
      eaChargers.forEach((c, idx) => {
        dbStore.updateChargerStatus(c.id, idx % 2 === 0 ? "AVAILABLE" : "OCCUPIED");
      });

      dbStore.updateVehicle(vehicle.id, {
        currentBatteryPercentage: 35,
        estimatedRangeKm: 120,
        currentLatitude: 13.0180,
        currentLongitude: 80.2100,
        connectionMode: "SIMULATION",
      });
      break;
    }

    case "scenario-3": {
      // Evening rush peak
      dbStore.setStationQueueCount("stn_tata_guindy", 5, 40);
      dbStore.setStationQueueCount("stn_zeon_ea", 3, 22);
      dbStore.setStationQueueCount("stn_jiobp_velachery", 2, 14);

      dbStore.createNotification({
        userId: vehicle.userId,
        title: "⚠️ High Congestion Alert — Chennai Metro",
        message: "Evening rush hour demand spike detected across Guindy and Royapettah hubs.",
        type: "CONGESTION_ALERT",
      });
      break;
    }

    case "scenario-4": {
      // Route corridor charging
      dbStore.updateVehicle(vehicle.id, {
        currentBatteryPercentage: 18,
        estimatedRangeKm: 55,
        connectionMode: "SIMULATION",
      });
      break;
    }

    case "scenario-5": {
      // Unsupported vehicle
      dbStore.updateVehicle(vehicle.id, {
        make: "Mahindra",
        model: "e-Verito Fleet",
        apiSupported: false,
        connectionMode: "OBD_DEVICE",
        connectorType: "CCS2",
      });
      break;
    }
  }

  return {
    success: true,
    message: `Activated ${scenario?.name || scenarioId}`,
    scenario,
  };
}
