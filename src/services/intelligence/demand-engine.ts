import { ChargingStation, Charger, QueueEntry } from "@/types";

export interface HourlyDemandForecast {
  hour: number;
  timeLabel: string;
  predictedUtilization: number; // 0 to 100%
  expectedWaitMinutes: number;
  demandLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  isPeakHour: boolean;
}

export interface InfrastructureGap {
  regionName: string;
  stationCount: number;
  fastChargerDensityKw: number;
  currentBottleneckLevel: "MODERATE" | "HIGH" | "CRITICAL";
  recommendation: string;
  estimatedUnmetDemandKwh: number;
}

export function forecastHourlyDemand(
  station: ChargingStation,
  chargers: Charger[],
  currentQueues: QueueEntry[],
  currentHour = new Date().getHours()
): HourlyDemandForecast[] {
  const forecasts: HourlyDemandForecast[] = [];
  const baseQueue = currentQueues.length;
  const totalKw = chargers.reduce((acc, c) => acc + c.powerKw, 0);

  for (let i = 0; i < 12; i++) {
    const targetHour = (currentHour + i) % 24;
    let baseUtilization = 30; // base off-peak

    // Evening rush peak (17:00 - 21:00)
    if (targetHour >= 17 && targetHour <= 21) {
      baseUtilization = 85;
    }
    // Morning rush peak (08:00 - 11:00)
    else if (targetHour >= 8 && targetHour <= 11) {
      baseUtilization = 72;
    }
    // Afternoon lull (13:00 - 16:00)
    else if (targetHour >= 13 && targetHour <= 16) {
      baseUtilization = 48;
    }
    // Late night (23:00 - 06:00)
    else {
      baseUtilization = 18;
    }

    // Adjust for current station capacity
    if (totalKw < 100) {
      baseUtilization = Math.min(100, baseUtilization + 15);
    }
    if (baseQueue > 2 && i <= 2) {
      baseUtilization = Math.min(100, baseUtilization + 20);
    }

    const waitMin = Math.round((baseUtilization / 100) * 28 * (1 + (baseQueue > 0 ? 0.3 : 0)));

    let demandLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" = "LOW";
    if (baseUtilization >= 85) demandLevel = "CRITICAL";
    else if (baseUtilization >= 65) demandLevel = "HIGH";
    else if (baseUtilization >= 40) demandLevel = "MODERATE";

    forecasts.push({
      hour: targetHour,
      timeLabel: `${targetHour % 12 === 0 ? 12 : targetHour % 12}:00 ${targetHour >= 12 ? "PM" : "AM"}`,
      predictedUtilization: baseUtilization,
      expectedWaitMinutes: waitMin,
      demandLevel,
      isPeakHour: (targetHour >= 17 && targetHour <= 21) || (targetHour >= 8 && targetHour <= 11),
    });
  }

  return forecasts;
}

export function analyzeInfrastructureGaps(
  stations: ChargingStation[],
  chargers: Charger[]
): InfrastructureGap[] {
  // Regional clusters in Chennai
  const clusters = [
    {
      region: "OMR IT Corridor & Sholinganallur",
      centerLat: 12.9010,
      centerLng: 80.2279,
      expectedEvFleet: 4200,
    },
    {
      region: "Guindy & Saidapet Commercial Belt",
      centerLat: 13.0102,
      centerLng: 80.2038,
      expectedEvFleet: 5600,
    },
    {
      region: "Central Chennai (Royapettah / T. Nagar)",
      centerLat: 13.0500,
      centerLng: 80.2450,
      expectedEvFleet: 6100,
    },
    {
      region: "North & West (Anna Nagar / Ambattur)",
      centerLat: 13.0850,
      centerLng: 80.2101,
      expectedEvFleet: 3800,
    },
  ];

  return clusters.map((c) => {
    // Find stations within 5km
    const nearby = stations.filter((s) => {
      const d = Math.hypot(s.latitude - c.centerLat, s.longitude - c.centerLng) * 111;
      return d <= 6;
    });

    const nearbyChargers = chargers.filter((chg) => nearby.some((s) => s.id === chg.stationId));
    const totalKw = nearbyChargers.reduce((sum, chg) => sum + chg.powerKw, 0);
    const fastCount = nearbyChargers.filter((chg) => chg.powerKw >= 60).length;

    let bottleneck: "MODERATE" | "HIGH" | "CRITICAL" = "MODERATE";
    let recommendation = "";
    let unmetKwh = 1200;

    if (fastCount < 3) {
      bottleneck = "CRITICAL";
      recommendation = `Severe shortage of DC Fast (>60kW) chargers. Only ${fastCount} high-power EVSEs available for high fleet density. Deploy 2x 120kW dual-gun chargers immediately.`;
      unmetKwh = 4800;
    } else if (totalKw < 300) {
      bottleneck = "HIGH";
      recommendation = `High peak demand with occasional queues exceeding 20 minutes. Expand grid allocation and add battery-buffered 150kW ultra-fast hubs.`;
      unmetKwh = 2900;
    } else {
      bottleneck = "MODERATE";
      recommendation = `Capacity currently balances average daily loads. Monitor peak holiday & evening rush hour growth.`;
      unmetKwh = 850;
    }

    return {
      regionName: c.region,
      stationCount: nearby.length,
      fastChargerDensityKw: totalKw,
      currentBottleneckLevel: bottleneck,
      recommendation,
      estimatedUnmetDemandKwh: unmetKwh,
    };
  });
}
