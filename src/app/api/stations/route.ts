import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db-store";
import { getSession } from "@/lib/auth";
import { openChargeMapService } from "@/services/charging/openchargemap-service";
import { stationCache } from "@/services/charging/station-cache";
import { ChargingStation, Charger } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const level = searchParams.get("level") || "auto"; // "overview" | "detail" | "auto"
    const boundsStr = searchParams.get("bounds"); // "minLng,minLat,maxLng,maxLat"
    const latStr = searchParams.get("lat");
    const lngStr = searchParams.get("lng");
    const zoomStr = searchParams.get("zoom");
    const distanceStr = searchParams.get("distance");

    const operator = searchParams.get("operator");
    const source = searchParams.get("source");
    const city = searchParams.get("city");
    const connector = searchParams.get("connector");
    const status = searchParams.get("status");
    const power = searchParams.get("power");

    const zoom = zoomStr ? parseFloat(zoomStr) : 5;
    const centerLat = latStr ? parseFloat(latStr) : undefined;
    const centerLng = lngStr ? parseFloat(lngStr) : undefined;
    const distanceKm = distanceStr ? parseFloat(distanceStr) : 40;

    let parsedBounds: { minLng: number; minLat: number; maxLng: number; maxLat: number } | null = null;
    if (boundsStr) {
      const parts = boundsStr.split(",").map((s) => parseFloat(s.trim()));
      if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
        parsedBounds = {
          minLng: Math.min(parts[0], parts[2]),
          minLat: Math.min(parts[1], parts[3]),
          maxLng: Math.max(parts[0], parts[2]),
          maxLat: Math.max(parts[1], parts[3]),
        };
      }
    } else if (centerLat !== undefined && centerLng !== undefined && Number.isFinite(centerLat) && Number.isFinite(centerLng)) {
      // Derive bounding box from center lat/lng and search radius (km)
      const dLat = distanceKm / 111;
      const dLng = distanceKm / (111 * Math.cos((centerLat * Math.PI) / 180));
      parsedBounds = {
        minLng: centerLng - dLng,
        minLat: centerLat - dLat,
        maxLng: centerLng + dLng,
        maxLat: centerLat + dLat,
      };
    }

    // Determine loading level:
    // If level === "overview" or (neither bounds nor center coordinates provided and zoom <= 6.5): India Overview (Level 1)
    // If bounds or center coordinates provided: City/Regional Corridor Detail (Level 2)
    const isOverview = level === "overview" || (!parsedBounds && zoom <= 6.5);

    if (isOverview) {
      // LEVEL 1: INDIA OVERVIEW
      const cacheKey = "india-overview";
      const cached = stationCache.get(cacheKey);
      let overviewStations = cached?.stations;
      let overviewChargersMap = cached?.chargersMap;

      if (!overviewStations || !overviewChargersMap) {
        const fetched = await openChargeMapService.fetchIndiaOverview(300);
        overviewStations = fetched.stations;
        overviewChargersMap = fetched.chargersMap;
        stationCache.set(cacheKey, { stations: fetched.stations, chargersMap: fetched.chargersMap });
      }

      // Upsert into dbStore so records accumulate and persist
      if (overviewStations && overviewChargersMap) {
        for (const stn of overviewStations) {
          const chargers = overviewChargersMap[stn.id] || [];
          const existing = dbStore.getStations().find(
            (s) => s.id === stn.id || s.externalId === stn.externalId || (Math.hypot(s.latitude - stn.latitude, s.longitude - stn.longitude) < 0.001)
          );
          if (existing) {
            dbStore.updateStation(existing.id, {
              sourceLastUpdated: stn.sourceLastUpdated,
              syncStatus: stn.syncStatus,
              hasLiveStatus: stn.hasLiveStatus,
              statusMessage: stn.statusMessage,
            });
          } else {
            dbStore.createStation(stn, chargers);
          }
        }
      }
    } else if (parsedBounds) {
      // LEVEL 2: REGIONAL / CITY VIEWPORT DETAIL
      const cacheKey = stationCache.getBboxKey(
        parsedBounds.minLat,
        parsedBounds.minLng,
        parsedBounds.maxLat,
        parsedBounds.maxLng
      );
      const cached = stationCache.get(cacheKey);
      let viewportStations = cached?.stations;
      let viewportChargersMap = cached?.chargersMap;

      if (!viewportStations || !viewportChargersMap) {
        const fetched = await openChargeMapService.fetchViewportStations({
          minLat: parsedBounds.minLat,
          minLng: parsedBounds.minLng,
          maxLat: parsedBounds.maxLat,
          maxLng: parsedBounds.maxLng,
          centerLat,
          centerLng,
          distanceKm,
        });

        viewportStations = fetched.stations;
        viewportChargersMap = fetched.chargersMap;
        stationCache.set(cacheKey, { stations: fetched.stations, chargersMap: fetched.chargersMap });
      }

      // Upsert viewport stations into dbStore
      if (viewportStations && viewportChargersMap) {
        for (const stn of viewportStations) {
          const chargers = viewportChargersMap[stn.id] || [];
          const existing = dbStore.getStations().find(
            (s) => s.id === stn.id || s.externalId === stn.externalId || (Math.hypot(s.latitude - stn.latitude, s.longitude - stn.longitude) < 0.001)
          );
          if (existing) {
            dbStore.updateStation(existing.id, {
              sourceLastUpdated: stn.sourceLastUpdated,
              syncStatus: stn.syncStatus,
              hasLiveStatus: stn.hasLiveStatus,
              statusMessage: stn.statusMessage,
            });
          } else {
            dbStore.createStation(stn, chargers);
          }
        }
      }
    }

    // Retrieve active stations from dbStore
    let stations = dbStore.getStations();

    // If viewport bounds specified, filter stations to viewport area + buffer
    if (parsedBounds && !isOverview) {
      const latBuf = 0.15;
      const lngBuf = 0.15;
      stations = stations.filter(
        (s) =>
          s.latitude >= parsedBounds!.minLat - latBuf &&
          s.latitude <= parsedBounds!.maxLat + latBuf &&
          s.longitude >= parsedBounds!.minLng - lngBuf &&
          s.longitude <= parsedBounds!.maxLng + lngBuf
      );
    }

    // Apply optional filter parameters
    if (operator) {
      stations = stations.filter((s) => s.operator.toLowerCase().includes(operator.toLowerCase()));
    }
    if (source) {
      stations = stations.filter((s) => s.source === source);
    }
    if (city) {
      stations = stations.filter((s) => s.city.toLowerCase().includes(city.toLowerCase()));
    }

    const allChargers = dbStore.getChargers();
    const allPrices = dbStore.getPrices();
    const allQueues = dbStore.getQueues();

    // Filter by connector standard, power, or status if requested
    let enrichedStations = stations.map((stn) => {
      const chargers = allChargers.filter((c) => c.stationId === stn.id);
      const price = allPrices.find((p) => p.stationId === stn.id);
      const queues = allQueues.filter((q) => q.stationId === stn.id);
      const availableCount = chargers.filter((c) => c.status === "AVAILABLE").length;

      const hasLiveStatus = stn.hasLiveStatus ?? (stn.source === "OCPI");
      const syncStatus = stn.syncStatus || (stn.source === "OCPI" ? "LIVE" : "RECENTLY_SYNCED");
      const statusMessage = stn.statusMessage || (hasLiveStatus ? undefined : "Availability not provided by operator.");

      return {
        ...stn,
        chargers,
        price,
        queueCount: hasLiveStatus ? queues.length : 0,
        totalChargers: chargers.length,
        availableChargers: hasLiveStatus ? availableCount : null,
        hasLiveStatus,
        syncStatus,
        statusMessage,
      };
    });

    if (connector && connector !== "ALL") {
      enrichedStations = enrichedStations.filter((s) =>
        s.chargers.some((c) => c.connectorType.toLowerCase() === connector.toLowerCase())
      );
    }

    if (power && power !== "ALL") {
      if (power === "ULTRA") {
        enrichedStations = enrichedStations.filter((s) => s.chargers.some((c) => c.powerKw >= 100));
      } else if (power === "FAST") {
        enrichedStations = enrichedStations.filter((s) => s.chargers.some((c) => c.powerKw >= 50));
      } else if (power === "SLOW") {
        enrichedStations = enrichedStations.filter((s) => s.chargers.some((c) => c.powerKw < 50));
      }
    }

    if (status && status !== "ALL") {
      if (status === "AVAILABLE") {
        enrichedStations = enrichedStations.filter((s) => (s.availableChargers ?? 1) > 0);
      } else if (status === "BUSY") {
        enrichedStations = enrichedStations.filter(
          (s) => s.hasLiveStatus && s.availableChargers !== null && s.availableChargers > 0 && s.availableChargers < s.totalChargers
        );
      } else if (status === "FULL") {
        enrichedStations = enrichedStations.filter((s) => s.hasLiveStatus && s.availableChargers === 0);
      } else if (status === "FAULTED") {
        enrichedStations = enrichedStations.filter((s) => s.chargers.some((c) => c.status === "FAULTED"));
      }
    }

    return NextResponse.json({
      success: true,
      level: isOverview ? "overview" : "detail",
      count: enrichedStations.length,
      stations: enrichedStations,
    });
  } catch (error) {
    console.error("GET /api/stations error:", error);
    return NextResponse.json({ error: "Failed to fetch stations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
    }

    const body = await req.json();
    const { name, operator, address, city, state, latitude, longitude, chargers } = body;

    if (!name || !operator || !address || !latitude || !longitude) {
      return NextResponse.json({ error: "Missing required station fields" }, { status: 400 });
    }

    const station = dbStore.createStation(
      {
        externalId: `ADM-${Date.now()}`,
        name,
        operator,
        address,
        city: city || "Metropolitan Region",
        state: state || "India",
        country: "India",
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        openingHours: "24/7",
        source: "LOCAL",
        verificationStatus: "VERIFIED",
        syncStatus: "LIVE",
        hasLiveStatus: true,
      },
      chargers
    );

    return NextResponse.json({ success: true, station }, { status: 201 });
  } catch (error) {
    console.error("POST /api/stations error:", error);
    return NextResponse.json({ error: "Failed to create station" }, { status: 500 });
  }
}
