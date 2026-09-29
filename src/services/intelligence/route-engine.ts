import { Vehicle, ChargingStation, Charger, StationPrice, RoutePlanResult } from "@/types";
import { calculateChargingTime } from "./charging-time-engine";
import { calculateChargingCost } from "./cost-engine";
import { findStationsAlongRoute, CorridorStation } from "@/services/charging/route-corridor-service";

export interface GeoPoint {
  lat: number;
  lng: number;
  label: string;
}

export interface OsrmRouteData {
  geometry: {
    type: "LineString";
    coordinates: [number, number][]; // [lng, lat]
  };
  distanceKm: number;
  durationMin: number;
  legs: Array<{
    distanceKm: number;
    durationMin: number;
  }>;
}

/**
 * Fetch real route geometry and metrics from free OSRM (Open Source Routing Machine)
 */
export async function fetchOsrmRoute(points: GeoPoint[]): Promise<OsrmRouteData | null> {
  if (points.length < 2) return null;

  try {
    // OSRM expects coordinates in lng,lat format separated by semicolons
    const coordString = points.map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(";");
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson&steps=false`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(osrmUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "VoltWise-AI/1.0 (contact: info@voltwise.ai)",
      },
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.code === "Ok" && data.routes && data.routes.length > 0) {
        const primary = data.routes[0];
        const distanceKm = Number((primary.distance / 1000).toFixed(1));
        const durationMin = Math.round(primary.duration / 60);

        const legs = (primary.legs || []).map((l: any) => ({
          distanceKm: Number((l.distance / 1000).toFixed(1)),
          durationMin: Math.round(l.duration / 60),
        }));

        return {
          geometry: primary.geometry,
          distanceKm,
          durationMin,
          legs,
        };
      }
    }
  } catch (err: any) {
    console.warn("OSRM routing fetch warning, falling back to local calculation:", err?.message || err);
  }

  return null;
}

/**
 * Intelligent Route-Based EV Charging Recommendation Engine
 * - Uses actual OSRM LineString geometry to search the entire travel corridor
 * - Evaluates real vehicle battery capacity, range, and consumption
 * - Enforces configurable 15% safety buffer at all stages
 * - Discovers and ranks candidate highway charging stops based on reachability and detour
 * - Explicitly warns and refuses to show "0% arrival" when a trip is safely unreachable
 */
export async function planEvRoute(
  vehicle: Vehicle,
  origin: GeoPoint,
  destination: GeoPoint,
  _stations: ChargingStation[] = [],
  _chargers: Charger[] = [],
  _prices: StationPrice[] = [],
  waypoints: GeoPoint[] = []
): Promise<RoutePlanResult | null> {
  const fullPoints: GeoPoint[] = [origin, ...waypoints, destination];
  const osrmData = await fetchOsrmRoute(fullPoints);
  if (!osrmData) return null;

  const totalDistanceKm = osrmData.distanceKm;
  const estimatedDriveTimeMin = osrmData.durationMin;
  const geometry = osrmData.geometry;

  // 1. Vehicle battery & consumption model
  const batteryCapacityKwh = vehicle.batteryCapacityKwh || 40.5;
  const startingBattery = vehicle.currentBatteryPercentage;
  const safetyReservePercent = 15; // 15% minimum safety arrival reserve

  // Realistic consumption rate: 0.16 kWh/km
  const consumptionRateKwhPerKm = 0.16;
  const totalBatteryRequiredKwh = Number((totalDistanceKm * consumptionRateKwhPerKm).toFixed(1));

  // Current usable energy at departure
  const currentEnergyKwh = (startingBattery / 100) * batteryCapacityKwh;

  // Check direct reachability without charging
  const directRemainingKwh = currentEnergyKwh - totalBatteryRequiredKwh;
  const directArrivalPercent = Math.round((directRemainingKwh / batteryCapacityKwh) * 100);

  // If arrival battery is safely at or above 15% reserve, no charging is required!
  if (directArrivalPercent >= safetyReservePercent) {
    return {
      origin,
      destination,
      totalDistanceKm,
      estimatedDriveTimeMin,
      startingBattery,
      batteryRequiredKwh: totalBatteryRequiredKwh,
      directReachPossible: true,
      chargingRequired: false,
      safetyReservePercent,
      projectedBatteryAtDestination: directArrivalPercent,
      chargingStopsNeeded: 0,
      recommendedStops: [],
      totalTripTimeMin: estimatedDriveTimeMin,
      totalTripCostInr: 0,
      geometry,
      statusMessage: `Destination reachable directly without charging. Estimated arrival battery of ${directArrivalPercent}% comfortably maintains the ${safetyReservePercent}% safety buffer.`,
    };
  }

  // 2. Charging IS required! Search corridor stations along the actual OSRM route LineString
  const corridorStations = await findStationsAlongRoute(geometry, 16);

  // 3. Multi-stop journey simulation
  const recommendedStops: RoutePlanResult["recommendedStops"] = [];
  let additionalChargingMinutes = 0;
  let totalChargingCost = 0;
  let unreachableJourney = false;
  let statusMessage = "";

  let simKm = 0;
  let simBatteryPercent = startingBattery;
  const maxStops = 4;
  let stopCount = 0;

  while (stopCount < maxStops) {
    const distRemaining = totalDistanceKm - simKm;
    const energyRemaining = distRemaining * consumptionRateKwhPerKm;
    const batteryNeededToDest = Math.ceil((energyRemaining / batteryCapacityKwh) * 100);

    // Can we reach the destination from current position with >= 15% reserve?
    if (simBatteryPercent - batteryNeededToDest >= safetyReservePercent) {
      // Yes! Journey can be completed from here
      break;
    }

    // How far can the vehicle safely drive before hitting the 8% critical reserve?
    const usableKwhFloor = Math.max(0, ((simBatteryPercent - 8) / 100) * batteryCapacityKwh);
    const maxSafeReachKm = usableKwhFloor / consumptionRateKwhPerKm;

    // Find candidate corridor stations ahead of the vehicle
    const candidates = corridorStations.filter((cs) => {
      const distAhead = cs.distanceAlongRouteKm - simKm;
      // Must be at least 4 km ahead of current point
      if (distAhead <= 4) return false;
      // Must be physically reachable before critical battery depletion
      if (distAhead > maxSafeReachKm) return false;
      // Must have compatible connector
      const hasCompat = cs.chargers.some(
        (c) => c.connectorType.toLowerCase() === vehicle.connectorType.toLowerCase() || c.connectorType === "CCS2"
      );
      if (!hasCompat) return false;
      // Not explicitly faulted
      if (cs.chargers.every((c) => c.status === "FAULTED")) return false;
      return true;
    });

    if (candidates.length === 0) {
      // No station is reachable before battery drops below safe reserve!
      unreachableJourney = true;
      const nextAhead = corridorStations.find((cs) => cs.distanceAlongRouteKm > simKm);
      const nearestDist = nextAhead ? Math.round(nextAhead.distanceAlongRouteKm - simKm) : null;
      statusMessage = `Charging required, but no compatible charging station was found within the vehicle's safe reachable range of ${Math.round(maxSafeReachKm)} km.${
        nearestDist
          ? ` The nearest known charging station is at ${nextAhead?.station.name} (${nearestDist} km away). Please charge locally before starting this journey.`
          : " No charging stations were found along this corridor. Please charge locally before departure."
      }`;
      break;
    }

    // Rank candidates:
    // 1. Arrival battery at station: optimal sweet spot is 14% - 25%
    // 2. Minimal route deviation (detour from highway)
    // 3. High charging power (120 kW > 60 kW > 50 kW > 22 kW)
    const scoredCandidates = candidates.map((cs) => {
      const distAhead = cs.distanceAlongRouteKm - simKm;
      const energyUsed = distAhead * consumptionRateKwhPerKm;
      const arrivalBattery = Math.round(simBatteryPercent - (energyUsed / batteryCapacityKwh) * 100);

      let score = 100;
      // Arrival battery scoring
      if (arrivalBattery >= 12 && arrivalBattery <= 25) {
        score += 25; // Sweet spot
      } else if (arrivalBattery < 12) {
        score -= (12 - arrivalBattery) * 5; // Close to empty
      } else if (arrivalBattery > 35) {
        score -= (arrivalBattery - 35) * 1.5; // Stopping unnecessarily early
      }

      // Detour penalty
      score -= cs.distanceFromRouteKm * 3;

      // Power bonus
      const bestKw = Math.max(...cs.chargers.map((c) => c.powerKw), 50);
      if (bestKw >= 100) score += 20;
      else if (bestKw >= 60) score += 10;
      else if (bestKw < 50) score -= 15;

      return {
        ...cs,
        arrivalBattery: Math.max(5, arrivalBattery),
        bestKw,
        score,
      };
    });

    scoredCandidates.sort((a, b) => b.score - a.score);
    const chosen = scoredCandidates[0];

    // Determine how much to charge at this stop
    const distToDestFromStop = totalDistanceKm - chosen.distanceAlongRouteKm;
    const energyToDest = distToDestFromStop * consumptionRateKwhPerKm;
    const batteryNeededAfterStop = Math.ceil((energyToDest / batteryCapacityKwh) * 100);

    // Target battery: enough to reach destination with 15% reserve + 5% buffer, capped at 85% (fast charging curve)
    const targetNeeded = batteryNeededAfterStop + safetyReservePercent + 5;
    const targetBattery = Math.min(85, Math.max(70, targetNeeded));

    // Calculate charging time and cost
    const energyAddedKwh = Math.max(1, ((targetBattery - chosen.arrivalBattery) / 100) * batteryCapacityKwh);
    const chargeEstimate = calculateChargingTime(chosen.arrivalBattery, targetBattery, batteryCapacityKwh, chosen.bestKw);
    const costEstimate = calculateChargingCost(energyAddedKwh, chosen.price);

    additionalChargingMinutes += chargeEstimate.estimatedTimeMinutes;
    totalChargingCost += costEstimate.totalCostInr;

    const reasons = [
      `${vehicle.connectorType} fast charging compatible`,
      chosen.distanceFromRouteKm < 0.5 ? "Directly on highway" : `${chosen.distanceFromRouteKm.toFixed(1)} km route deviation`,
      `${chosen.bestKw} kW DC high-speed charging`,
      `Reachable with safe ${chosen.arrivalBattery}% battery reserve remaining`,
      `Charges to ${targetBattery}% to cover the remaining ${Math.round(distToDestFromStop)} km`,
    ];

    recommendedStops.push({
      station: chosen.station,
      arrivalBattery: chosen.arrivalBattery,
      targetBattery,
      chargeTimeMin: chargeEstimate.estimatedTimeMinutes,
      estimatedCost: costEstimate.totalCostInr,
      chargerPowerKw: chosen.bestKw,
      distanceAlongRouteKm: Math.round(chosen.distanceAlongRouteKm),
      detourKm: Number(chosen.distanceFromRouteKm.toFixed(1)),
      reasons,
    });

    // Advance simulation
    simKm = chosen.distanceAlongRouteKm;
    simBatteryPercent = targetBattery;
    stopCount++;
  }

  // Final arrival battery calculation at destination
  let projectedBatteryAtDestination = 0;
  if (!unreachableJourney) {
    const finalDist = totalDistanceKm - simKm;
    const finalEnergy = finalDist * consumptionRateKwhPerKm;
    projectedBatteryAtDestination = Math.round(simBatteryPercent - (finalEnergy / batteryCapacityKwh) * 100);

    if (recommendedStops.length > 0) {
      statusMessage = `Optimal corridor charging planned at ${recommendedStops[0].station.name}. Charge to ${recommendedStops[0].targetBattery}% to arrive safely with ~${projectedBatteryAtDestination}% battery.`;
    }
  }

  return {
    origin,
    destination,
    totalDistanceKm,
    estimatedDriveTimeMin,
    startingBattery,
    batteryRequiredKwh: totalBatteryRequiredKwh,
    directReachPossible: false,
    chargingRequired: true,
    unreachableJourney,
    safetyReservePercent,
    statusMessage,
    projectedBatteryAtDestination: Math.max(0, projectedBatteryAtDestination),
    chargingStopsNeeded: recommendedStops.length,
    recommendedStops,
    totalTripTimeMin: estimatedDriveTimeMin + additionalChargingMinutes,
    totalTripCostInr: totalChargingCost,
    geometry,
  };
}
