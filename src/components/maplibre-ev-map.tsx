"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  Map as MapLibreMap,
  Marker,
  Popup,
  NavigationControl,
  ScaleControl,
  LngLatBounds,
  setWorkerUrl,
  type StyleSpecification,
  type GeoJSONSource,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  ChargingStation,
  Charger,
  StationPrice,
  QueueEntry,
} from "@/types";
import {
  Zap,
  Navigation,
  Clock,
  Layers,
  Search,
  Crosshair,
  CalendarCheck,
  Plus,
  RefreshCw,
  Info,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldCheck,
  Share2,
} from "lucide-react";

// Configure MapLibre Web Worker specifically for Next.js and Turbopack
if (typeof window !== "undefined") {
  setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
}

interface MapLibreEvMapProps {
  stations: ChargingStation[];
  chargers: Charger[];
  prices: StationPrice[];
  queues: QueueEntry[];
  recommendedStationId?: string;
  recommendedStationIds?: string[];
  startLocation?: {
    lat: number;
    lng: number;
    label?: string;
    source: "GPS" | "SEARCH";
  } | null;
  vehicleLocation?: { lat: number; lng: number };
  destinationLocation?: { lat: number; lng: number; label?: string };
  routeGeometry?: { type: "LineString"; coordinates: [number, number][] } | null;
  highlightedStationId?: string;
  onSelectStation?: (stationId: string) => void;
  userRangeKm?: number;
  onLocationUpdate?: (coords: { lat: number; lng: number; label: string }) => void;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  onViewportChange?: (viewport: {
    bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number };
    zoom: number;
    center: { lat: number; lng: number };
  }) => void;
}

// Self-contained OpenStreetMap raster style for MapLibre GL JS
// Free and open — zero third-party API keys or billing required
const OPENSTREETMAP_STYLE: StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    osm: {
      type: "raster",
      tiles: [
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#0E100F" },
    },
    {
      id: "osm",
      type: "raster",
      source: "osm",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

export function MapLibreEvMap({
  stations,
  chargers,
  prices,
  queues,
  recommendedStationId,
  recommendedStationIds,
  startLocation,
  vehicleLocation,
  destinationLocation,
  routeGeometry,
  highlightedStationId,
  onSelectStation,
  userRangeKm = 160,
  onLocationUpdate,
  initialCenter,
  initialZoom,
  onViewportChange,
}: MapLibreEvMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // UI state
  const [selectedStationId, setSelectedStationId] = useState<string | null>(
    highlightedStationId || null
  );
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapTimeWindow, setHeatmapTimeWindow] = useState<"CURRENT" | "1HR" | "3HR" | "PEAK">("CURRENT");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "AVAILABLE" | "BUSY" | "FULL">("ALL");
  const [connectorFilter, setConnectorFilter] = useState("ALL");
  const [powerFilter, setPowerFilter] = useState<"ALL" | "FAST" | "ULTRA">("ALL");
  const [reachableOnly, setReachableOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [locatingUser, setLocatingUser] = useState(false);
  const [geoNotice, setGeoNotice] = useState<string | null>(null);

  // Filter stations based on controls
  const filteredStations = useMemo(() => {
    return stations.filter((stn) => {
      // 1. Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = stn.name.toLowerCase().includes(q);
        const matchesOp = stn.operator.toLowerCase().includes(q);
        const matchesAddr = stn.address.toLowerCase().includes(q);
        const matchesCity = stn.city.toLowerCase().includes(q);
        const matchesState = stn.state.toLowerCase().includes(q);
        if (!matchesName && !matchesOp && !matchesAddr && !matchesCity && !matchesState) return false;
      }

      // 2. Power filter
      const stnChargers = chargers.filter((c) => c.stationId === stn.id);
      if (powerFilter === "ULTRA" && !stnChargers.some((c) => c.powerKw >= 100)) return false;
      if (powerFilter === "FAST" && !stnChargers.some((c) => c.powerKw >= 50)) return false;

      // 3. Connector filter
      if (connectorFilter !== "ALL" && !stnChargers.some((c) => c.connectorType.toLowerCase() === connectorFilter.toLowerCase())) {
        return false;
      }

      // 4. Reachable filter (only active if explicitly requested)
      if (reachableOnly && vehicleLocation) {
        const dLat = (stn.latitude - vehicleLocation.lat) * 111;
        const dLng = (stn.longitude - vehicleLocation.lng) * 111;
        const distKm = Math.sqrt(dLat * dLat + dLng * dLng);
        if (distKm > userRangeKm) return false;
      }

      // 5. Status filter
      if (statusFilter !== "ALL") {
        if (stn.hasLiveStatus === false) {
          // If no live telemetry, show in ALL, and in AVAILABLE if operational
          if (statusFilter === "FULL") return false;
        } else {
          const availableCount = stnChargers.filter((c) => c.status === "AVAILABLE").length;
          if (statusFilter === "AVAILABLE" && availableCount === 0) return false;
          if (statusFilter === "BUSY" && (availableCount === 0 || availableCount === stnChargers.length)) return false;
          if (statusFilter === "FULL" && availableCount > 0) return false;
        }
      }

      return true;
    });
  }, [
    stations,
    chargers,
    searchQuery,
    powerFilter,
    connectorFilter,
    reachableOnly,
    statusFilter,
    vehicleLocation,
    userRangeKm,
  ]);

  const selectedStation = useMemo(() => {
    return stations.find((s) => s.id === selectedStationId) || null;
  }, [stations, selectedStationId]);

  const selectedChargers = useMemo(() => {
    if (!selectedStation) return [];
    return chargers.filter((c) => c.stationId === selectedStation.id);
  }, [selectedStation, chargers]);

  const selectedPrice = useMemo(() => {
    if (!selectedStation) return null;
    return prices.find((p) => p.stationId === selectedStation.id) || null;
  }, [selectedStation, prices]);

  const selectedQueue = useMemo(() => {
    if (!selectedStation) return null;
    return queues.find((q) => q.stationId === selectedStation.id) || null;
  }, [selectedStation, queues]);

  // Initialize MapLibre GL map instance
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    try {
      if (typeof window !== "undefined") {
        setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      }

      // Default camera: Center of India (22.5, 79.0) unless startLocation or destinationLocation is provided
      const startLng = initialCenter?.lng ?? (startLocation ? startLocation.lng : destinationLocation ? destinationLocation.lng : vehicleLocation ? vehicleLocation.lng : 79.0);
      const startLat = initialCenter?.lat ?? (startLocation ? startLocation.lat : destinationLocation ? destinationLocation.lat : vehicleLocation ? vehicleLocation.lat : 22.5);
      const startZoom = initialZoom ?? (destinationLocation || startLocation || routeGeometry ? 11 : 4.6);

      const map = new MapLibreMap({
        container: mapContainerRef.current,
        style: OPENSTREETMAP_STYLE,
        center: [startLng, startLat],
        zoom: startZoom,
        pitch: 0,
        attributionControl: false,
      });

      // Add navigation controls (zoom, compass)
      map.addControl(new NavigationControl({ showCompass: true, showZoom: true }), "top-right");
      map.addControl(new ScaleControl({ unit: "metric" }), "bottom-right");

      map.on("load", () => {
        setMapLoaded(true);

        // Add Heatmap Source and Layer
        map.addSource("station-heat-source", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
        });

        map.addLayer({
          id: "station-heat-layer",
          type: "heatmap",
          source: "station-heat-source",
          maxzoom: 15,
          layout: {
            visibility: "none",
          },
          paint: {
            "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 0, 0, 10, 1],
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 4, 1, 15, 3],
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(0, 255, 128, 0)",
              0.2,
              "rgba(143, 227, 136, 0.7)",
              0.5,
              "rgba(242, 184, 75, 0.85)",
              0.8,
              "rgba(234, 91, 91, 0.95)",
            ],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 4, 15, 15, 45],
            "heatmap-opacity": 0.75,
          },
        });

        // Add Route Line Source and Layer
        map.addSource("active-route-source", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
        });

        map.addLayer({
          id: "active-route-casing",
          type: "line",
          source: "active-route-source",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#0E100F",
            "line-width": 7,
            "line-opacity": 0.85,
          },
        });

        map.addLayer({
          id: "active-route-line",
          type: "line",
          source: "active-route-source",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#69B7FF",
            "line-width": 4,
            "line-opacity": 0.95,
          },
        });
      });

      map.on("error", (e) => {
        console.warn("MapLibre event error:", e);
      });

      mapInstanceRef.current = map;
    } catch (err: any) {
      console.error("MapLibre initialization error:", err);
      setMapError("Failed to initialize MapLibre GL map. Check browser WebGL support.");
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Listen to map moveend and zoomend to inform parent of viewport change (debounced)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded || !onViewportChange) return;

    let timeoutId: NodeJS.Timeout;

    const handleMovementFinished = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (!mapInstanceRef.current) return;
        const bounds = mapInstanceRef.current.getBounds();
        const center = mapInstanceRef.current.getCenter();
        const zoom = mapInstanceRef.current.getZoom();

        onViewportChange({
          bounds: {
            minLng: bounds.getWest(),
            minLat: bounds.getSouth(),
            maxLng: bounds.getEast(),
            maxLat: bounds.getNorth(),
          },
          zoom,
          center: { lat: center.lat, lng: center.lng },
        });
      }, 400);
    };

    map.on("moveend", handleMovementFinished);
    map.on("zoomend", handleMovementFinished);

    return () => {
      clearTimeout(timeoutId);
      map.off("moveend", handleMovementFinished);
      map.off("zoomend", handleMovementFinished);
    };
  }, [mapLoaded, onViewportChange]);

  // Update Route Geometry Layer when route changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    const source = map.getSource("active-route-source") as GeoJSONSource | undefined;
    if (!source) return;

    if (routeGeometry && routeGeometry.coordinates && routeGeometry.coordinates.length > 0) {
      source.setData({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: routeGeometry,
            properties: {},
          },
        ],
      });

      // Fit map to route bounds
      const bounds = new LngLatBounds();
      routeGeometry.coordinates.forEach((coord) => bounds.extend(coord));
      map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
    } else {
      source.setData({
        type: "FeatureCollection",
        features: [],
      });
    }
  }, [routeGeometry, mapLoaded]);

  // Update Heatmap Layer data when stations, queue, or time window change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    const source = map.getSource("station-heat-source") as GeoJSONSource | undefined;
    if (!source) return;

    if (showHeatmap) {
      map.setLayoutProperty("station-heat-layer", "visibility", "visible");

      const features = filteredStations.map((stn) => {
        const stnQueue = queues.find((q) => q.stationId === stn.id);
        let weight = 5;

        if (stn.hasLiveStatus) {
          if (heatmapTimeWindow === "PEAK") {
            weight = (stnQueue?.estimatedWaitMinutes || 10) * 1.8;
          } else if (heatmapTimeWindow === "3HR") {
            weight = (stnQueue?.estimatedWaitMinutes || 8) * 1.3;
          } else if (heatmapTimeWindow === "1HR") {
            weight = (stnQueue?.estimatedWaitMinutes || 6) * 1.1;
          } else {
            weight = stnQueue?.estimatedWaitMinutes || 5;
          }
        } else {
          weight = 4; // Baseline indicative density
        }

        return {
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [stn.longitude, stn.latitude],
          },
          properties: {
            weight: Math.max(1, weight),
          },
        };
      });

      source.setData({
        type: "FeatureCollection",
        features,
      });
    } else {
      map.setLayoutProperty("station-heat-layer", "visibility", "none");
    }
  }, [showHeatmap, heatmapTimeWindow, filteredStations, queues, mapLoaded]);

  // Marker clustering & updating logic
  const updateMapMarkers = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // 1. Start Location Marker (Live GPS Radar or Searched Origin Pin)
    const effectiveOrigin = startLocation || (vehicleLocation && Number.isFinite(vehicleLocation.lat) && Number.isFinite(vehicleLocation.lng) ? { lat: vehicleLocation.lat, lng: vehicleLocation.lng, source: "GPS" as const, label: "Current Location" } : null);

    if (effectiveOrigin && Number.isFinite(effectiveOrigin.lat) && Number.isFinite(effectiveOrigin.lng)) {
      const originEl = document.createElement("div");
      originEl.className = "voltwise-origin-marker";

      if (effectiveOrigin.source === "GPS") {
        // Live GPS Pulsing Radar Marker
        originEl.innerHTML = `
          <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;" title="${effectiveOrigin.label || "Current Location (GPS)"}">
            <span style="position: absolute; width: 100%; height: 100%; border-radius: 9999px; background: rgba(105, 183, 255, 0.4); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
            <div style="width: 22px; height: 22px; border-radius: 9999px; background: #161917; border: 2.5px solid #69B7FF; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px rgba(105, 183, 255, 0.7); z-index: 10;">
              <div style="width: 8px; height: 8px; border-radius: 9999px; background: #69B7FF;"></div>
            </div>
          </div>
        `;
      } else {
        // Searched Origin Marker (distinct solid pin style)
        originEl.innerHTML = `
          <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;" title="${effectiveOrigin.label || "Trip Origin (Searched)"}">
            <div style="width: 26px; height: 26px; border-radius: 9999px; background: #161917; border: 2px solid #69B7FF; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px rgba(105, 183, 255, 0.6); font-size: 11px; font-weight: 800; color: #69B7FF;">
              📍
            </div>
          </div>
        `;
      }

      const originMarker = new Marker({ element: originEl, anchor: "center" })
        .setLngLat([effectiveOrigin.lng, effectiveOrigin.lat])
        .addTo(map);
      markersRef.current.push(originMarker);
    }

    // 2. Destination Marker (if provided)
    if (destinationLocation) {
      const destEl = document.createElement("div");
      destEl.className = "voltwise-destination-marker";
      destEl.innerHTML = `
        <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;" title="${destinationLocation.label || "Trip Destination"}">
          <div style="width: 26px; height: 26px; border-radius: 9999px; background: #1D211E; border: 2px solid #C6FF3D; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px rgba(198, 255, 61, 0.5); font-size: 11px; font-weight: bold; color: #C6FF3D;">
            🏁
          </div>
        </div>
      `;

      const destMarker = new Marker({ element: destEl, anchor: "center" })
        .setLngLat([destinationLocation.lng, destinationLocation.lat])
        .addTo(map);
      markersRef.current.push(destMarker);
    }

    // 3. Station Markers with Multi-Level Spatial Clustering
    const currentZoom = map.getZoom();

    // Determine cluster threshold by zoom level:
    // When zoomed out to India (< 7): group wide regions (~65px)
    // When zoomed to state/metro (7 - 11): group city hubs (~50px)
    // When zoomed into city (>= 11.5): individual stations appear
    const clusterPixelRadius = currentZoom < 7 ? 65 : currentZoom < 11.5 ? 48 : 0;

    const clusters: Array<{
      id: string;
      isCluster: boolean;
      latitude: number;
      longitude: number;
      stations: ChargingStation[];
      availableCount: number;
      totalChargers: number;
      hasFault: boolean;
    }> = [];

    if (currentZoom >= 11.5) {
      // Zoomed in: display all individual station markers
      filteredStations.forEach((stn) => {
        const stnChargers = chargers.filter((c) => c.stationId === stn.id);
        const avail = stnChargers.filter((c) => c.status === "AVAILABLE").length;
        clusters.push({
          id: stn.id,
          isCluster: false,
          latitude: stn.latitude,
          longitude: stn.longitude,
          stations: [stn],
          availableCount: avail,
          totalChargers: stnChargers.length,
          hasFault: stnChargers.some((c) => c.status === "FAULTED"),
        });
      });
    } else {
      // Zoomed out: cluster nearby station points
      const processed = new Set<string>();

      filteredStations.forEach((stn) => {
        if (processed.has(stn.id)) return;
        processed.add(stn.id);

        const ptA = map.project([stn.longitude, stn.latitude]);
        const group: ChargingStation[] = [stn];

        filteredStations.forEach((other) => {
          if (processed.has(other.id)) return;
          const ptB = map.project([other.longitude, other.latitude]);
          const dist = Math.hypot(ptA.x - ptB.x, ptA.y - ptB.y);
          if (dist < clusterPixelRadius) {
            processed.add(other.id);
            group.push(other);
          }
        });

        const isGroupCluster = group.length > 1;
        const avgLat = group.reduce((sum, s) => sum + s.latitude, 0) / group.length;
        const avgLng = group.reduce((sum, s) => sum + s.longitude, 0) / group.length;

        let avail = 0;
        let total = 0;
        let hasFault = false;
        group.forEach((s) => {
          const sChargers = chargers.filter((c) => c.stationId === s.id);
          avail += sChargers.filter((c) => c.status === "AVAILABLE").length;
          total += sChargers.length;
          if (sChargers.some((c) => c.status === "FAULTED")) hasFault = true;
        });

        clusters.push({
          id: isGroupCluster ? `cluster_${stn.id}_${group.length}` : stn.id,
          isCluster: isGroupCluster,
          latitude: avgLat,
          longitude: avgLng,
          stations: group,
          availableCount: avail,
          totalChargers: total,
          hasFault,
        });
      });
    }

    // Render cluster & station markers
    clusters.forEach((cluster) => {
      if (cluster.isCluster) {
        // Multi-station Cluster Marker
        const clusterEl = document.createElement("div");
        clusterEl.className = "voltwise-cluster-marker";
        clusterEl.style.cursor = "pointer";
        clusterEl.innerHTML = `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.2s;" title="${cluster.stations.length} Charging Stations — Click to zoom in">
            <span style="position: absolute; width: 100%; height: 100%; border-radius: 9999px; background: rgba(198, 255, 61, 0.35); animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
            <div style="padding: 4px 10px; border-radius: 9999px; background: #161917; border: 2px solid #C6FF3D; display: flex; align-items: center; gap: 4px; box-shadow: 0 4px 16px rgba(198, 255, 61, 0.45); z-index: 10; white-space: nowrap;">
              <span style="font-size: 11px;">⚡</span>
              <span style="font-size: 11px; font-weight: 800; color: #C6FF3D; letter-spacing: -0.2px;">${cluster.stations.length} stations</span>
            </div>
          </div>
        `;

        clusterEl.addEventListener("click", (e) => {
          e.stopPropagation();
          map.flyTo({
            center: [cluster.longitude, cluster.latitude],
            zoom: Math.min(map.getZoom() + 2.5, 14),
            essential: true,
          });
        });

        const clusterMarker = new Marker({ element: clusterEl, anchor: "center" })
          .setLngLat([cluster.longitude, cluster.latitude])
          .addTo(map);
        markersRef.current.push(clusterMarker);
      } else {
        // Individual Station Marker
        const stn = cluster.stations[0];
        const isRecommended =
          stn.id === recommendedStationId ||
          (recommendedStationIds ? recommendedStationIds.includes(stn.id) : false);
        const isSelected = stn.id === selectedStationId;
        const availableCount = cluster.availableCount;
        const isFaulted = cluster.hasFault;
        const hasLive = stn.hasLiveStatus;

        let markerBg = "#C6FF3D"; // Green = Available
        let markerText = "#0E100F";
        let ringColor = "rgba(198, 255, 61, 0.4)";
        let markerContent = isRecommended ? "★" : String(availableCount);

        if (!hasLive) {
          // Open Charge Map directory point without live occupancy
          markerBg = "#C6FF3D";
          markerText = "#0E100F";
          ringColor = "rgba(198, 255, 61, 0.4)";
          markerContent = isRecommended ? "★" : "⚡";
        } else if (isFaulted) {
          markerBg = "#EA5B5B"; // Red = Faulted
          markerText = "#F5F3EA";
          ringColor = "rgba(234, 91, 91, 0.4)";
        } else if (availableCount === 0) {
          markerBg = "#EA5B5B"; // Red = Full
          markerText = "#F5F3EA";
          ringColor = "rgba(234, 91, 91, 0.4)";
        } else if (availableCount < cluster.totalChargers) {
          markerBg = "#F2B84B"; // Amber = Busy
          markerText = "#0E100F";
          ringColor = "rgba(242, 184, 75, 0.4)";
        }

        const stnEl = document.createElement("div");
        stnEl.className = `voltwise-station-marker ${isRecommended ? "recommended" : ""}`;
        stnEl.style.cursor = "pointer";
        stnEl.innerHTML = `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; transition: transform 0.2s;" title="${stn.name} (${stn.operator})">
            ${
              isRecommended
                ? `<span style="position: absolute; width: 38px; height: 38px; border-radius: 9999px; border: 2px dashed #C6FF3D; animation: spin-slow 15s linear infinite; pointer-events: none;"></span>`
                : ""
            }
            <div style="width: ${isSelected ? "34px" : "28px"}; height: ${isSelected ? "34px" : "28px"}; border-radius: 9999px; background: ${markerBg}; border: 2.5px solid ${isSelected ? "#F5F3EA" : "#161917"}; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px ${ringColor}; font-weight: 800; font-size: ${isSelected ? "13px" : "11px"}; color: ${markerText};">
              ${markerContent}
            </div>
          </div>
        `;

        stnEl.addEventListener("click", () => {
          setSelectedStationId(stn.id);
          if (onSelectStation) onSelectStation(stn.id);
        });

        const stnMarker = new Marker({ element: stnEl, anchor: "center" })
          .setLngLat([stn.longitude, stn.latitude])
          .addTo(map);

        markersRef.current.push(stnMarker);
      }
    });
  }, [
    mapLoaded,
    filteredStations,
    chargers,
    startLocation,
    vehicleLocation,
    destinationLocation,
    recommendedStationId,
    recommendedStationIds,
    selectedStationId,
    onSelectStation,
  ]);

  // Center camera when startLocation updates and no active route geometry is displayed
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded || !startLocation) return;
    if (!routeGeometry || !routeGeometry.coordinates || routeGeometry.coordinates.length === 0) {
      map.flyTo({
        center: [startLocation.lng, startLocation.lat],
        zoom: 13,
        essential: true,
      });
    }
  }, [startLocation?.lat, startLocation?.lng, mapLoaded, routeGeometry]);

  // Re-cluster markers on map zoom/move
  useEffect(() => {
    updateMapMarkers();

    const map = mapInstanceRef.current;
    if (!map) return;

    map.on("zoomend", updateMapMarkers);
    map.on("moveend", updateMapMarkers);

    return () => {
      map.off("zoomend", updateMapMarkers);
      map.off("moveend", updateMapMarkers);
    };
  }, [updateMapMarkers]);

  // Browser Geolocation API
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoNotice("Geolocation is not supported by your browser.");
      setTimeout(() => setGeoNotice(null), 3500);
      return;
    }

    setLocatingUser(true);
    setGeoNotice("Acquiring GPS position...");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingUser(false);
        const { latitude, longitude } = pos.coords;
        setGeoNotice("Location acquired. Zooming to current position.");
        setTimeout(() => setGeoNotice(null), 3000);

        if (onLocationUpdate) {
          onLocationUpdate({
            lat: latitude,
            lng: longitude,
            label: `Current GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
          });
        }

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo({
            center: [longitude, latitude],
            zoom: 13,
            essential: true,
          });
        }
      },
      (err) => {
        setLocatingUser(false);
        let msg = "Location permission denied. Please allow location access in browser settings.";
        if (err.code === 2) msg = "Position unavailable. Please select on map.";
        if (err.code === 3) msg = "Location request timed out.";
        setGeoNotice(msg);
        setTimeout(() => setGeoNotice(null), 4000);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="relative w-full h-[620px] rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xl flex flex-col md:flex-row">
      {/* Map Filter Controls Bar */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 max-w-[calc(100%-24px)] pointer-events-auto">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search city, hub, operator..."
            className="bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-subtle)] focus:border-[var(--primary-accent)] rounded-lg pl-7 pr-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none shadow-md w-48 sm:w-56"
          />
        </div>

        {/* Status Filter */}
        <div className="bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-subtle)] rounded-lg p-0.5 flex items-center text-xs shadow-md">
          {(["ALL", "AVAILABLE", "BUSY", "FULL"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                statusFilter === s
                  ? "bg-[var(--primary-accent)] text-[#0E100F]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Connector Standard */}
        <select
          value={connectorFilter}
          onChange={(e) => setConnectorFilter(e.target.value)}
          className="bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none cursor-pointer shadow-md"
        >
          <option value="ALL">All Connectors</option>
          <option value="CCS2">CCS2</option>
          <option value="Type 2">Type 2</option>
          <option value="CHAdeMO">CHAdeMO</option>
          <option value="GB/T">GB/T</option>
        </select>

        {/* Power Filter */}
        <select
          value={powerFilter}
          onChange={(e) => setPowerFilter(e.target.value as any)}
          className="bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none cursor-pointer shadow-md"
        >
          <option value="ALL">All Speeds</option>
          <option value="FAST">Fast (≥50 kW)</option>
          <option value="ULTRA">Ultra-Fast (≥100 kW)</option>
        </select>

        {/* Reachable Range Toggle */}
        <button
          type="button"
          onClick={() => setReachableOnly(!reachableOnly)}
          className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-md ${
            reachableOnly
              ? "bg-[var(--primary-accent)]/15 border-[var(--primary-accent)] text-[var(--primary-accent)] font-semibold"
              : "bg-[var(--bg-surface)]/90 border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>Reachable ({userRangeKm} km)</span>
        </button>

        {/* Dynamic Heatmap Toggle */}
        <button
          type="button"
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-md ${
            showHeatmap
              ? "bg-[var(--warning)]/15 border-[var(--warning)] text-[var(--warning)] font-semibold"
              : "bg-[var(--bg-surface)]/90 border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-[var(--warning)]" />
          <span>Queue Heatmap</span>
        </button>

        {/* Heatmap Time Filters (only visible when heatmap active) */}
        {showHeatmap && (
          <div className="bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-subtle)] rounded-lg p-0.5 flex items-center text-xs shadow-md animate-fadeIn">
            {(["CURRENT", "1HR", "3HR", "PEAK"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setHeatmapTimeWindow(t)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                  heatmapTimeWindow === t
                    ? "bg-[var(--warning)] text-[#0E100F]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Current Location GPS Button */}
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={locatingUser}
          title="Use my current GPS location"
          className="p-1.5 rounded-lg bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-subtle)] hover:border-[var(--info)] text-[var(--info)] shadow-md cursor-pointer transition-colors"
        >
          <Navigation className={`w-4 h-4 ${locatingUser ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Geolocation Feedback Notice */}
      {geoNotice && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] shadow-lg flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-[var(--info)]" />
          <span>{geoNotice}</span>
        </div>
      )}

      {/* Main MapLibre GL Map Viewport */}
      <div className="relative flex-1 w-full h-full min-h-[400px]">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Loading / Error States */}
        {!mapLoaded && !mapError && (
          <div className="absolute inset-0 bg-[var(--bg-primary)] flex flex-col items-center justify-center space-y-3 z-10">
            <RefreshCw className="w-6 h-6 text-[var(--primary-accent)] animate-spin" />
            <span className="text-xs text-[var(--text-secondary)] font-medium">
              Initializing MapLibre GL mapping engine...
            </span>
          </div>
        )}

        {mapError && (
          <div className="absolute inset-0 bg-[var(--bg-primary)]/90 flex flex-col items-center justify-center p-6 text-center space-y-3 z-10">
            <AlertTriangle className="w-8 h-8 text-[var(--danger)]" />
            <h4 className="text-sm font-bold text-[var(--text-primary)]">Map Data Temporarily Unavailable</h4>
            <p className="text-xs text-[var(--text-muted)] max-w-sm">{mapError}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-secondary px-3 py-1.5 rounded-lg text-xs"
            >
              Retry
            </button>
          </div>
        )}

        {/* Map Legend */}
        <div className="absolute bottom-3 left-3 z-10 bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-[11px] text-[var(--text-secondary)] shadow-lg flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C6FF3D]"></span>
            <span>Available / Hub</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F2B84B]"></span>
            <span>Busy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EA5B5B]"></span>
            <span>Full / Fault</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#69B7FF]"></span>
            <span>Vehicle</span>
          </div>
          <div className="text-[10px] text-[var(--text-muted)] pl-2 border-l border-[var(--border-subtle)]">
            © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="hover:underline text-[var(--text-secondary)]">OpenStreetMap contributors</a> • Open Charge Map
          </div>
        </div>
      </div>

      {/* Selected Station Details Sheet / Drawer */}
      {selectedStation && (
        <div className="w-full md:w-80 bg-[var(--bg-surface)] border-t md:border-t-0 md:border-l border-[var(--border-subtle)] p-4 flex flex-col justify-between overflow-y-auto z-20 shadow-2xl">
          <div className="space-y-4">
            {/* Header with Close */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--primary-accent)] tracking-wider block">
                  {selectedStation.operator}
                </span>
                <h3 className="font-bold text-sm text-[var(--text-primary)] leading-snug mt-0.5">
                  {selectedStation.name}
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-1 line-clamp-2">
                  {selectedStation.address}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStationId(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 text-xs"
              >
                ✕
              </button>
            </div>

            {/* Freshness Badge & Operational Status */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--border-subtle)]">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] font-medium">
                {selectedStation.syncStatus === "LIVE"
                  ? "LIVE · Verified"
                  : selectedStation.syncStatus === "RECENTLY_SYNCED"
                  ? "RECENTLY SYNCED · OCM"
                  : selectedStation.syncStatus === "STALE"
                  ? "STALE VERIFICATION"
                  : selectedStation.source === "OPEN_CHARGE_MAP"
                  ? "OPEN CHARGE MAP"
                  : selectedStation.source === "BEE"
                  ? "BEE INDIA"
                  : "OCPI PROTOCOL"}
              </span>
              <span className="text-[10px] text-[var(--success)] font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Compatible
              </span>
            </div>

            {/* Availability / Metrics */}
            {selectedStation.hasLiveStatus ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                  <span className="text-[10px] text-[var(--text-muted)] block">Available Bays</span>
                  <span className="text-base font-bold text-[var(--primary-accent)]">
                    {selectedChargers.filter((c) => c.status === "AVAILABLE").length} /{" "}
                    {selectedChargers.length}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                  <span className="text-[10px] text-[var(--text-muted)] block">Est. Queue Wait</span>
                  <span className="text-base font-bold text-[var(--text-primary)] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[var(--warning)]" />
                    {selectedQueue?.estimatedWaitMinutes || "0"} min
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-[var(--info)] font-medium">
                  <Info className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Availability not provided by operator.</span>
                </div>
                <p className="text-[10px] text-[var(--text-muted)]">
                  Total installed capacity: {selectedChargers.length} charging point{selectedChargers.length !== 1 ? "s" : ""}.
                </p>
              </div>
            )}

            {/* Charger Connector List */}
            <div>
              <span className="text-[11px] font-bold text-[var(--text-secondary)] block mb-2">
                Available Connectors ({selectedChargers.length})
              </span>
              <div className="space-y-1.5">
                {selectedChargers.map((chg) => (
                  <div
                    key={chg.id}
                    className="p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-[var(--text-primary)] block">
                        {chg.connectorType}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {chg.powerKw} kW • {chg.chargingType.replace("_", " ")}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        chg.status === "AVAILABLE"
                          ? "bg-[var(--primary-accent)]/15 text-[var(--primary-accent)]"
                          : chg.status === "OCCUPIED"
                          ? "bg-[var(--warning)]/15 text-[var(--warning)]"
                          : "bg-[var(--danger)]/15 text-[var(--danger)]"
                      }`}
                    >
                      {selectedStation.hasLiveStatus ? chg.status : "INSTALLED"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tariffs & Pricing */}
            <div className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs flex justify-between items-center">
              <span className="text-[var(--text-secondary)]">Tariff Rate</span>
              <span className="font-bold text-[var(--text-primary)]">
                {selectedPrice?.pricePerKwh ? `₹${selectedPrice.pricePerKwh} / kWh` : "Standard Operator Tariff"}
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="pt-4 border-t border-[var(--border-subtle)] space-y-2">
            <button
              type="button"
              onClick={() => {
                window.location.href = `/reservations?stationId=${selectedStation.id}`;
              }}
              className="btn-primary w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              Reserve Charger Slot
            </button>

            <button
              type="button"
              onClick={() => {
                window.location.href = `/plan-trip?destLat=${selectedStation.latitude}&destLng=${selectedStation.longitude}&label=${encodeURIComponent(
                  selectedStation.name
                )}`;
              }}
              className="btn-secondary w-full py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5 text-[var(--info)]" />
              Plan Route to Station
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
