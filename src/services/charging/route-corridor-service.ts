import { ChargingStation, Charger, StationPrice, Vehicle } from "@/types";
import { dbStore } from "@/lib/db-store";
import { openChargeMapService } from "./openchargemap-service";
import { stationCache } from "./station-cache";

export interface CorridorStation {
  station: ChargingStation;
  chargers: Charger[];
  price: StationPrice;
  distanceAlongRouteKm: number;
  distanceFromRouteKm: number; // Detour from route LineString
}

/**
 * Standard Haversine distance in kilometers
 */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Project a point (lng, lat) onto a line segment [(x1,y1), (x2,y2)]
 */
function pointToSegmentProjection(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { distKm: number; t: number; projX: number; projY: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    return { distKm: haversineKm(py, px, y1, x1), t: 0, projX: x1, projY: y1 };
  }

  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  const distKm = haversineKm(py, px, projY, projX);

  return { distKm, t, projX, projY };
}

/**
 * Project a station onto the OSRM route LineString
 * Returns the perpendicular deviation (km) and cumulative distance along route from origin (km)
 */
export function projectStationOntoRoute(
  stnLat: number,
  stnLng: number,
  coordinates: [number, number][],
  cumulativeDistances: number[]
): { distanceFromRouteKm: number; distanceAlongRouteKm: number } {
  let minDeviation = Infinity;
  let bestDistAlongRoute = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const p1 = coordinates[i];
    const p2 = coordinates[i + 1];
    const segDist = cumulativeDistances[i + 1] - cumulativeDistances[i];

    const proj = pointToSegmentProjection(stnLng, stnLat, p1[0], p1[1], p2[0], p2[1]);
    if (proj.distKm < minDeviation) {
      minDeviation = proj.distKm;
      bestDistAlongRoute = cumulativeDistances[i] + proj.t * segDist;
    }
  }

  return {
    distanceFromRouteKm: minDeviation,
    distanceAlongRouteKm: bestDistAlongRoute,
  };
}

/**
 * Sample representative search centers along the route LineString (every ~35 km)
 * Avoids hammering Open Charge Map with hundreds of queries while ensuring full corridor coverage
 */
export function sampleRouteCorridorCenters(
  coordinates: [number, number][],
  cumulativeDistances: number[],
  sampleIntervalKm = 35
): Array<{ lat: number; lng: number; distKm: number }> {
  if (coordinates.length === 0) return [];

  const totalDist = cumulativeDistances[cumulativeDistances.length - 1];
  const centers: Array<{ lat: number; lng: number; distKm: number }> = [];

  // Always include origin
  centers.push({
    lat: coordinates[0][1],
    lng: coordinates[0][0],
    distKm: 0,
  });

  let targetDist = sampleIntervalKm;
  let coordIdx = 0;

  while (targetDist < totalDist) {
    while (coordIdx < cumulativeDistances.length - 1 && cumulativeDistances[coordIdx + 1] < targetDist) {
      coordIdx++;
    }

    if (coordIdx < coordinates.length - 1) {
      const p1 = coordinates[coordIdx];
      const p2 = coordinates[coordIdx + 1];
      const segSpan = cumulativeDistances[coordIdx + 1] - cumulativeDistances[coordIdx];
      const t = segSpan > 0 ? (targetDist - cumulativeDistances[coordIdx]) / segSpan : 0;

      centers.push({
        lat: p1[1] + t * (p2[1] - p1[1]),
        lng: p1[0] + t * (p2[0] - p1[0]),
        distKm: targetDist,
      });
    }

    targetDist += sampleIntervalKm;
  }

  // Always include destination
  const last = coordinates[coordinates.length - 1];
  centers.push({
    lat: last[1],
    lng: last[0],
    distKm: totalDist,
  });

  return centers;
}

/**
 * Core Corridor Station Discovery
 * Searches charging stations within a corridor around the actual OSRM route geometry
 */
export async function findStationsAlongRoute(
  geometry: { type: "LineString"; coordinates: [number, number][] },
  maxDeviationKm = 16
): Promise<CorridorStation[]> {
  const coords = geometry.coordinates;
  if (!coords || coords.length < 2) return [];

  // Precalculate cumulative distances along route geometry
  const cumulativeDistances: number[] = [0];
  for (let i = 0; i < coords.length - 1; i++) {
    const d = haversineKm(coords[i][1], coords[i][0], coords[i + 1][1], coords[i + 1][0]);
    cumulativeDistances.push(cumulativeDistances[i] + d);
  }
  const totalRouteDistKm = cumulativeDistances[cumulativeDistances.length - 1];

  // Sample corridor centers every ~35 km
  const sampleCenters = sampleRouteCorridorCenters(coords, cumulativeDistances, 35);

  // Pool stations from local store and query OCM along each corridor center
  const candidateMap = new Map<string, { station: ChargingStation; chargers: Charger[] }>();

  // 1. Gather all existing stations in local dbStore
  const localStations = dbStore.getStations();
  const allChargers = dbStore.getChargers();
  for (const stn of localStations) {
    const chgs = allChargers.filter((c) => c.stationId === stn.id);
    candidateMap.set(stn.id, { station: stn, chargers: chgs });
  }

  // 2. Query each corridor center (~35km radius) to ensure fresh highway stations are discovered
  await Promise.all(
    sampleCenters.map(async (center) => {
      try {
        const cacheKey = stationCache.getCenterRadiusKey(center.lat, center.lng, 35);
        const cached = stationCache.get(cacheKey);

        let stations = cached?.stations;
        let chargersMap = cached?.chargersMap;

        if (!stations || !chargersMap) {
          const dLat = 35 / 111;
          const dLng = 35 / (111 * Math.cos((center.lat * Math.PI) / 180));
          const freshData = await openChargeMapService.fetchViewportStations({
            minLat: center.lat - dLat,
            minLng: center.lng - dLng,
            maxLat: center.lat + dLat,
            maxLng: center.lng + dLng,
            centerLat: center.lat,
            centerLng: center.lng,
            distanceKm: 35,
          });
          stations = freshData.stations;
          chargersMap = freshData.chargersMap;
          stationCache.set(cacheKey, { stations, chargersMap });
        }

        if (stations && chargersMap) {
          for (const s of stations) {
            const chgs = chargersMap[s.id] || [];
            if (!candidateMap.has(s.id)) {
              candidateMap.set(s.id, { station: s, chargers: chgs });
            }
          }
        }
      } catch (err) {
        console.warn(`Corridor query warning at (${center.lat.toFixed(2)}, ${center.lng.toFixed(2)}):`, err);
      }
    })
  );

  // 3. Project each candidate onto the route LineString
  const prices = dbStore.getPrices();
  const corridorStations: CorridorStation[] = [];

  for (const item of Array.from(candidateMap.values())) {
    const { station, chargers } = item;
    const { distanceFromRouteKm, distanceAlongRouteKm } = projectStationOntoRoute(
      station.latitude,
      station.longitude,
      coords,
      cumulativeDistances
    );

    // Keep stations that are within the allowed corridor deviation and situated along the route
    if (
      distanceFromRouteKm <= maxDeviationKm &&
      distanceAlongRouteKm >= 0 &&
      distanceAlongRouteKm <= totalRouteDistKm + 8
    ) {
      const price = prices.find((p) => p.stationId === station.id) || {
        id: `prc_${station.id}`,
        stationId: station.id,
        pricingType: "PER_KWH" as const,
        pricePerKwh: 18.5,
        sessionFee: 20,
        parkingFee: 0,
        currency: "INR",
        effectiveFrom: new Date().toISOString(),
      };

      corridorStations.push({
        station,
        chargers,
        price,
        distanceAlongRouteKm,
        distanceFromRouteKm,
      });
    }
  }

  // Sort corridor stations by distance along route from origin
  corridorStations.sort((a, b) => a.distanceAlongRouteKm - b.distanceAlongRouteKm);

  return corridorStations;
}
