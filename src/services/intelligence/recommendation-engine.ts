import {
  Vehicle,
  ChargingStation,
  Charger,
  StationPrice,
  QueueEntry,
  StationRecommendation,
} from "@/types";
import { calculateQueueMetrics } from "./queue-engine";
import { calculateChargingTime } from "./charging-time-engine";
import { calculateChargingCost } from "./cost-engine";

// Haversine distance formula in kilometers
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

export function recommendBestStations(
  vehicle: Vehicle,
  stations: ChargingStation[],
  allChargers: Charger[],
  allPrices: StationPrice[],
  allQueues: QueueEntry[],
  destination?: { lat: number; lng: number }
): StationRecommendation[] {
  const currentRangeKm = vehicle.estimatedRangeKm;
  const currentBattery = vehicle.currentBatteryPercentage;
  const userConnector = vehicle.connectorType;

  const recommendations: StationRecommendation[] = stations.map((station) => {
    const stationChargers = allChargers.filter((c) => c.stationId === station.id);
    const stationPrice =
      allPrices.find((p) => p.stationId === station.id) || {
        id: "def",
        stationId: station.id,
        pricingType: "PER_KWH" as const,
        pricePerKwh: 18.0,
        sessionFee: 15,
        parkingFee: 0,
        currency: "INR",
        effectiveFrom: new Date().toISOString(),
      };
    const stationQueues = allQueues.filter((q) => q.stationId === station.id && q.status === "WAITING");

    const distanceKm = calculateDistanceKm(
      vehicle.currentLatitude,
      vehicle.currentLongitude,
      station.latitude,
      station.longitude
    );

    // Urban traffic estimate ~22 km/h
    const estimatedTravelTimeMin = Math.max(3, Math.round((distanceKm / 22) * 60));

    // Queue & Congestion metrics
    const queueMetrics = calculateQueueMetrics(station.id, stationChargers, stationQueues);

    // Connector compatibility
    const compatibleChargers = stationChargers.filter(
      (c) => c.connectorType === userConnector
    );
    const hasCompatible = compatibleChargers.length > 0;

    // Available matching chargers
    const availableMatching = compatibleChargers.filter((c) => c.status === "AVAILABLE");

    // Best power rating
    const bestChargerKw =
      compatibleChargers.length > 0
        ? Math.max(...compatibleChargers.map((c) => c.powerKw))
        : Math.max(...stationChargers.map((c) => c.powerKw), 22);

    // Charging time up to 80%
    const chargeTimeResult = calculateChargingTime(
      currentBattery,
      80,
      vehicle.batteryCapacityKwh,
      bestChargerKw
    );

    // Charging cost
    const costResult = calculateChargingCost(chargeTimeResult.energyNeededKwh, stationPrice);

    // Battery arrival check
    const energyToReachKwh = distanceKm * 0.16; // approx 160 Wh/km
    const batteryDrainPercent = (energyToReachKwh / vehicle.batteryCapacityKwh) * 100;
    const batteryArrivalPercent = Math.max(0, Math.round(currentBattery - batteryDrainPercent));
    const canSafelyReach = currentRangeKm >= distanceKm * 1.15; // 15% safety buffer

    // MULTI-FACTOR SCORING CALCULATION
    // Base score: 100
    let score = 100;
    const reasons: string[] = [];

    // 1. Safety penalty
    if (!canSafelyReach) {
      score -= 80;
      reasons.push("⚠️ Dangerously low range to reach this station");
    }

    // 2. Compatibility
    if (!hasCompatible) {
      score -= 70;
      reasons.push(`❌ No matching ${userConnector} connector`);
    } else {
      reasons.push(`✓ Compatible ${userConnector} connector`);
    }

    // 3. Charger Availability & Wait time
    if (availableMatching.length > 0 && queueMetrics.queueLength === 0) {
      score += 25;
      reasons.push(`✓ Zero queue — ${availableMatching.length} charger(s) immediately available`);
    } else {
      const waitPenalty = queueMetrics.estimatedWaitMinutes * 1.8;
      score -= waitPenalty;
      if (queueMetrics.estimatedWaitMinutes <= 5) {
        reasons.push(`✓ Minimal wait time (~${queueMetrics.estimatedWaitMinutes} min)`);
      } else {
        reasons.push(`⏳ ${queueMetrics.estimatedWaitMinutes} min estimated waiting queue`);
      }
    }

    // 4. Charger Speed
    if (bestChargerKw >= 120) {
      score += 20;
      reasons.push(`⚡ Ultra-fast ${bestChargerKw} kW DC charger`);
    } else if (bestChargerKw >= 50) {
      score += 10;
      reasons.push(`⚡ Fast ${bestChargerKw} kW DC charger`);
    }

    // 5. Travel distance & time
    const distancePenalty = distanceKm * 2.2;
    score -= distancePenalty;
    if (distanceKm <= 5) {
      reasons.push(`📍 Only ${distanceKm} km away (~${estimatedTravelTimeMin} min drive)`);
    } else {
      reasons.push(`📍 ${distanceKm} km away`);
    }

    // 6. Cost competitiveness
    if (stationPrice.pricePerKwh <= 18) {
      score += 10;
      reasons.push(`💰 Competitive tariff (₹${stationPrice.pricePerKwh}/kWh)`);
    }

    // 7. Route alignment if destination provided
    if (destination) {
      const directDist = calculateDistanceKm(
        vehicle.currentLatitude,
        vehicle.currentLongitude,
        destination.lat,
        destination.lng
      );
      const stationToDest = calculateDistanceKm(
        station.latitude,
        station.longitude,
        destination.lat,
        destination.lng
      );
      const detour = distanceKm + stationToDest - directDist;
      if (detour <= 3.5) {
        score += 15;
        reasons.push(`🛣️ Directly on your travel corridor (${detour.toFixed(1)} km detour)`);
      }
    }

    // 8. Station verification status
    if (station.verificationStatus === "VERIFIED") {
      score += 5;
    }

    return {
      station,
      chargers: stationChargers,
      price: stationPrice,
      distanceKm,
      estimatedTravelTimeMin,
      availableChargersCount: availableMatching.length,
      totalChargersCount: stationChargers.length,
      queueLength: queueMetrics.queueLength,
      estimatedWaitMinutes: queueMetrics.estimatedWaitMinutes,
      bestChargerKw,
      estimatedChargingTimeMin: chargeTimeResult.estimatedTimeMinutes,
      estimatedCostInr: costResult.totalCostInr,
      score: Math.max(0, Math.round(score)),
      reasons,
      isRecommended: false,
      congestionLevel: queueMetrics.congestionLevel,
      canSafelyReach,
      batteryArrivalPercent,
    };
  });

  // Sort by score descending
  recommendations.sort((a, b) => b.score - a.score);

  if (recommendations.length > 0) {
    recommendations[0].isRecommended = true;
  }

  return recommendations;
}
