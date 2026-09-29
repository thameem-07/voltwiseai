"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { DemoControlBar } from "@/components/demo-control-bar";
import dynamic from "next/dynamic";

const MapLibreEvMap = dynamic(
  () => import("@/components/maplibre-ev-map").then((mod) => mod.MapLibreEvMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[520px] rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col items-center justify-center space-y-3">
        <div className="w-6 h-6 border-2 border-[var(--primary-accent)] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-[var(--text-secondary)] font-medium">
          Loading VoltWise Route Map Engine...
        </span>
      </div>
    ),
  }
);
import {
  Route,
  MapPin,
  Zap,
  Plus,
  Trash2,
  ArrowDown,
  ArrowUp,
  Clock,
  IndianRupee,
  Battery,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Search,
  Crosshair,
  Loader2,
  X,
} from "lucide-react";
import { RoutePlanResult, Vehicle, ChargingStation, Charger, StationPrice, QueueEntry } from "@/types";

interface StopPoint {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

interface GeocodeItem {
  id: string;
  label: string;
  displayName: string;
  lat: number;
  lng: number;
  type: string;
}

interface StartLocation {
  lat: number;
  lng: number;
  name: string;
  source: "GPS" | "SEARCH";
}

const COMMON_PLACES = [
  { label: "Phoenix Marketcity, Velachery", lat: 12.9915, lng: 80.2173 },
  { label: "Chennai International Airport (MAA)", lat: 12.9815, lng: 80.1636 },
  { label: "Marina Beach Promenade", lat: 13.0499, lng: 80.2824 },
  { label: "Siruseri SIPCOT IT Park (OMR)", lat: 12.8284, lng: 80.2198 },
  { label: "SRM University Tech Park (Kattankulathur)", lat: 12.8231, lng: 80.0454 },
  { label: "Mahabalipuram Coastal Heritage Corridor", lat: 12.6269, lng: 80.1929 },
  { label: "Express Avenue Mall, Royapettah", lat: 13.0588, lng: 80.2641 },
];

export default function PlanTripPage() {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);

  // Dynamic Start Location State: GPS or Searched (No hardcoded default)
  const [startLocation, setStartLocation] = useState<StartLocation | null>(null);
  const [startInputText, setStartInputText] = useState("");
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [gpsErrorNotice, setGpsErrorNotice] = useState<string | null>(null);

  // Autocomplete / Search state for Start Location
  const [startSuggestions, setStartSuggestions] = useState<GeocodeItem[]>([]);
  const [startSearching, setStartSearching] = useState(false);
  const [showStartDropdown, setShowStartDropdown] = useState(false);
  const startSearchTimeout = useRef<NodeJS.Timeout | null>(null);

  const [destinationQuery, setDestinationQuery] = useState("Phoenix Marketcity, Velachery");
  const [destLat, setDestLat] = useState(12.9915);
  const [destLng, setDestLng] = useState(80.2173);

  // Autocomplete / Search state for destination
  const [destSuggestions, setDestSuggestions] = useState<GeocodeItem[]>([]);
  const [destSearching, setDestSearching] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const destSearchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Autocomplete / Search state for new stop
  const [stopSuggestions, setStopSuggestions] = useState<GeocodeItem[]>([]);
  const [stopSearching, setStopSearching] = useState(false);
  const stopSearchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Intermediate stops
  const [stops, setStops] = useState<StopPoint[]>([]);
  const [newStopInput, setNewStopInput] = useState("");
  const [showAddStop, setShowAddStop] = useState(false);

  // Route & Station state
  const [calculating, setCalculating] = useState(false);
  const [routePlan, setRoutePlan] = useState<(RoutePlanResult & { geometry?: any }) | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Stations for map rendering
  const [stations, setStations] = useState<ChargingStation[]>([]);
  const [chargers, setChargers] = useState<Charger[]>([]);
  const [prices, setPrices] = useState<StationPrice[]>([]);
  const [queues, setQueues] = useState<QueueEntry[]>([]);

  // Initial Load: Automatically attempt browser GPS geolocation on mount
  useEffect(() => {
    fetch("/api/vehicle")
      .then((res) => res.json())
      .then((vData) => {
        if (vData.vehicle) {
          setVehicle(vData.vehicle);
        }
      })
      .catch((err) => console.error("Plan trip vehicle load error:", err));

    fetch("/api/stations?limit=60")
      .then((res) => res.json())
      .then((sData) => {
        if (sData.stations) {
          setStations(sData.stations);
          const chgList: Charger[] = [];
          const prcList: StationPrice[] = [];
          sData.stations.forEach((s: any) => {
            if (s.chargers) chgList.push(...s.chargers);
            if (s.price) prcList.push(s.price);
          });
          setChargers(chgList);
          setPrices(prcList);
        }
      })
      .catch((err) => console.error("Plan trip stations load error:", err));

    // Request GPS location automatically on page mount
    if (typeof window !== "undefined" && navigator.geolocation) {
      setIsLocatingGps(true);
      setGpsErrorNotice(null);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setStartLocation({
            lat: latitude,
            lng: longitude,
            name: "Current location",
            source: "GPS",
          });
          setIsLocatingGps(false);
          setGpsErrorNotice(null);
        },
        (err) => {
          setIsLocatingGps(false);
          console.warn("Auto GPS error:", err);
          if (err.code === err.PERMISSION_DENIED) {
            setGpsErrorNotice("Location permission denied. Search for a starting point instead.");
          } else if (err.code === err.TIMEOUT) {
            setGpsErrorNotice("Location request timed out. Search for a starting point instead.");
          } else {
            setGpsErrorNotice("Unable to access your location. Search for a starting point instead.");
          }
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setGpsErrorNotice("Unable to access your location. Search for a starting point instead.");
    }
  }, []);

  // Debounced Place Search for Destination
  const handleDestinationQueryChange = (val: string) => {
    setDestinationQuery(val);
    setShowDestDropdown(true);

    if (destSearchTimeout.current) clearTimeout(destSearchTimeout.current);

    if (val.trim().length < 2) {
      setDestSuggestions([]);
      setDestSearching(false);
      return;
    }

    setDestSearching(true);
    destSearchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(val)}`);
        const data = await res.json();
        if (data.results) {
          setDestSuggestions(data.results);
        }
      } catch (err) {
        console.warn("Destination search error:", err);
      } finally {
        setDestSearching(false);
      }
    }, 350);
  };

  // Debounced Place Search for Start Location
  const handleStartQueryChange = (val: string) => {
    setStartInputText(val);
    setShowStartDropdown(true);

    if (startSearchTimeout.current) clearTimeout(startSearchTimeout.current);

    if (val.trim().length < 2) {
      setStartSuggestions([]);
      setStartSearching(false);
      return;
    }

    setStartSearching(true);
    startSearchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(val)}`);
        const data = await res.json();
        if (data.results) {
          setStartSuggestions(data.results);
        }
      } catch (err) {
        console.warn("Start search error:", err);
      } finally {
        setStartSearching(false);
      }
    }, 350);
  };

  const handleSelectStartLocation = (item: { label: string; displayName?: string; lat: number; lng: number }) => {
    setStartLocation({
      lat: item.lat,
      lng: item.lng,
      name: item.label,
      source: "SEARCH",
    });
    setStartInputText("");
    setStartSuggestions([]);
    setShowStartDropdown(false);
    setGpsErrorNotice(null);
  };

  const handleClearStart = () => {
    setStartLocation(null);
    setStartInputText("");
    setStartSuggestions([]);
    setShowStartDropdown(false);
    setRoutePlan(null);
    setRouteError(null);
  };

  // Debounced Place Search for Adding Intermediate Stop
  const handleStopInputChange = (val: string) => {
    setNewStopInput(val);

    if (stopSearchTimeout.current) clearTimeout(stopSearchTimeout.current);

    if (val.trim().length < 2) {
      setStopSuggestions([]);
      setStopSearching(false);
      return;
    }

    setStopSearching(true);
    stopSearchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(val)}`);
        const data = await res.json();
        if (data.results) {
          setStopSuggestions(data.results);
        }
      } catch (err) {
        console.warn("Stop search error:", err);
      } finally {
        setStopSearching(false);
      }
    }, 350);
  };

  const handleCalculateRoute = async () => {
    if (!startLocation || !Number.isFinite(startLocation.lat) || !Number.isFinite(startLocation.lng)) {
      setRoutePlan(null);
      return;
    }
    if (!destLat || !destLng) {
      setRoutePlan(null);
      return;
    }

    try {
      setCalculating(true);
      setRouteError(null);

      const res = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: { lat: startLocation.lat, lng: startLocation.lng, label: startLocation.name },
          destination: { lat: destLat, lng: destLng, label: destinationQuery },
          waypoints: stops.map((s) => ({ lat: s.lat, lng: s.lng, label: s.label })),
          vehicleId: vehicle?.id || "veh_nexon_01",
          batteryPercentage: vehicle?.currentBatteryPercentage || 45,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.route) {
        setRoutePlan(data.route);
        setRouteError(null);

        // Merge recommended stop stations into map stations state so they render prominently
        if (data.route.recommendedStops && data.route.recommendedStops.length > 0) {
          setStations((prev) => {
            const map = new Map<string, ChargingStation>();
            prev.forEach((s) => map.set(s.id, s));
            data.route.recommendedStops.forEach((rs: any) => {
              if (rs.station) map.set(rs.station.id, rs.station);
            });
            return Array.from(map.values());
          });
        }
      } else {
        setRoutePlan(null);
        setRouteError(data.error || "Route unavailable. Try again.");
      }
    } catch (err) {
      console.error(err);
      setRoutePlan(null);
      setRouteError("Route unavailable. Try again.");
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    if (startLocation && Number.isFinite(startLocation.lat) && Number.isFinite(startLocation.lng) && Number.isFinite(destLat) && Number.isFinite(destLng)) {
      handleCalculateRoute();
    } else {
      setRoutePlan(null);
    }
  }, [startLocation?.lat, startLocation?.lng, destLat, destLng, stops.length]);

  // Browser Geolocation for Origin (Current Location)
  const handleUseCurrentGps = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGpsErrorNotice("Geolocation is not supported by your browser. Search for a starting point instead.");
      return;
    }

    setIsLocatingGps(true);
    setGpsErrorNotice(null);
    setShowStartDropdown(false);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setStartLocation({
          lat: latitude,
          lng: longitude,
          name: "Current location",
          source: "GPS",
        });
        setStartInputText("");
        setStartSuggestions([]);
        setIsLocatingGps(false);
        setGpsErrorNotice(null);
      },
      (err) => {
        setIsLocatingGps(false);
        console.warn("GPS error:", err);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsErrorNotice("Location permission denied. Search for a starting point instead.");
        } else if (err.code === err.TIMEOUT) {
          setGpsErrorNotice("Location request timed out. Search for a starting point instead.");
        } else {
          setGpsErrorNotice("Unable to access your location. Search for a starting point instead.");
        }
      },
      { enableHighAccuracy: true, timeout: 7000 }
    );
  };

  const handleAddStop = (place: { label: string; lat: number; lng: number }) => {
    const newStop: StopPoint = {
      id: `stop_${Date.now()}`,
      label: place.label,
      lat: place.lat,
      lng: place.lng,
    };
    setStops([...stops, newStop]);
    setNewStopInput("");
    setStopSuggestions([]);
    setShowAddStop(false);
  };

  const handleRemoveStop = (id: string) => {
    setStops(stops.filter((s) => s.id !== id));
  };

  const handleMoveStop = (index: number, direction: "UP" | "DOWN") => {
    const newStops = [...stops];
    const targetIdx = direction === "UP" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newStops.length) return;
    const temp = newStops[index];
    newStops[index] = newStops[targetIdx];
    newStops[targetIdx] = temp;
    setStops(newStops);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col pb-24">
      <Navbar />

      <DemoControlBar onScenarioChange={handleCalculateRoute} currentBattery={vehicle?.currentBatteryPercentage || 45} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <Route className="w-6 h-6 text-[var(--primary-accent)]" />
            Trip & Route Optimizer
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
            Calculate real travel energy consumption via OSRM, add multi-stop waypoints, and discover optimal charging bays.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Form: Waypoints & Stops Planner */}
          <div className="space-y-4">
            <div className="card-level-2 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                <h3 className="font-bold text-sm text-[var(--text-primary)]">
                  Journey Stops & Waypoints
                </h3>
                <span className="text-[11px] text-[var(--text-muted)] font-mono">
                  {stops.length + 2} Points
                </span>
              </div>

              {/* Start Point (Current GPS or Searched Location) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                    Origin (Starting Point)
                  </span>
                  <button
                    type="button"
                    onClick={handleUseCurrentGps}
                    disabled={isLocatingGps}
                    className="text-[10px] text-[var(--info)] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {isLocatingGps ? (
                      <Loader2 className="w-3 h-3 animate-spin text-[var(--info)]" />
                    ) : (
                      <Crosshair className="w-3 h-3" />
                    )}
                    <span>{isLocatingGps ? "Locating..." : "Use My GPS"}</span>
                  </button>
                </div>

                {/* Active Selected Start Location Card */}
                {startLocation && (
                  <div className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] flex items-center justify-between gap-2 shadow-sm">
                    <div className="flex items-center gap-2 truncate">
                      {startLocation.source === "GPS" ? (
                        <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--info)] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--info)]"></span>
                        </span>
                      ) : (
                        <MapPin className="w-3.5 h-3.5 text-[var(--info)] flex-shrink-0" />
                      )}
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-semibold truncate">{startLocation.name}</span>
                        {startLocation.source === "GPS" ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[var(--primary-accent)]/15 text-[var(--primary-accent)] border border-[var(--primary-accent)]/30 flex-shrink-0">
                            GPS LIVE
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)] flex-shrink-0">
                            Search location
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearStart}
                      title="Clear starting location"
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-md hover:bg-[var(--bg-surface)] transition-colors cursor-pointer flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Search Starting Location Input */}
                <div className="relative">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      value={startInputText}
                      onChange={(e) => handleStartQueryChange(e.target.value)}
                      onFocus={() => {
                        if (startSuggestions.length > 0) setShowStartDropdown(true);
                      }}
                      placeholder={startLocation ? "Search different starting location..." : "Search starting location (e.g. Chennai, T. Nagar, Bengaluru)..."}
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] focus:border-[var(--primary-accent)] rounded-xl pl-8 pr-8 py-2 text-xs text-[var(--text-primary)] outline-none"
                    />
                    {startSearching && (
                      <Loader2 className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-[var(--primary-accent)] animate-spin" />
                    )}
                  </div>

                  {/* Suggestions Dropdown for Start */}
                  {showStartDropdown && startSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl shadow-2xl p-1 max-h-56 overflow-y-auto">
                      {startSuggestions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectStartLocation(item)}
                          className="w-full text-left p-2 rounded-lg hover:bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] transition-colors cursor-pointer"
                        >
                          <div className="font-semibold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-[var(--info)]" />
                            <span>{item.label}</span>
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] pl-4 truncate">{item.displayName}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* GPS Locating indicator */}
                {isLocatingGps && (
                  <div className="p-2 rounded-lg bg-[var(--info)]/10 border border-[var(--info)]/20 text-[11px] text-[var(--info)] flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                    <span>Locating you...</span>
                  </div>
                )}

                {/* GPS Notice / Error Fallback */}
                {gpsErrorNotice && (
                  <div className="p-2.5 rounded-lg bg-[var(--warning)]/10 border border-[var(--warning)]/25 text-[11px] text-[var(--warning)] flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>{gpsErrorNotice}</span>
                  </div>
                )}
              </div>

              {/* Intermediate Stops */}
              {stops.length > 0 && (
                <div className="space-y-2">
                  <span className="block text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                    Intermediate Stops ({stops.length})
                  </span>
                  {stops.map((stop, idx) => (
                    <div
                      key={stop.id}
                      className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-5 h-5 rounded-full bg-[var(--bg-surface)] text-[var(--text-secondary)] flex items-center justify-center font-mono text-[10px] font-bold border border-[var(--border-subtle)] flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="truncate font-medium text-[var(--text-primary)]">
                          {stop.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveStop(idx, "UP")}
                          className="p-1 hover:text-[var(--primary-accent)] disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === stops.length - 1}
                          onClick={() => handleMoveStop(idx, "DOWN")}
                          className="p-1 hover:text-[var(--primary-accent)] disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveStop(stop.id)}
                          className="p-1 hover:text-[var(--danger)] cursor-pointer text-[var(--text-muted)]"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Stop Button */}
              {!showAddStop ? (
                <button
                  type="button"
                  onClick={() => setShowAddStop(true)}
                  className="w-full py-2 rounded-xl border border-dashed border-[var(--border-subtle)] hover:border-[var(--primary-accent)] text-xs text-[var(--text-secondary)] hover:text-[var(--primary-accent)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Add Intermediate Stop
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--text-primary)]">Add Waypoint Stop</span>
                    <button
                      type="button"
                      onClick={() => setShowAddStop(false)}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      value={newStopInput}
                      onChange={(e) => handleStopInputChange(e.target.value)}
                      placeholder="Search stop address or landmark..."
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] focus:border-[var(--primary-accent)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] outline-none"
                    />
                    {stopSearching && (
                      <Loader2 className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--primary-accent)] animate-spin" />
                    )}
                  </div>

                  {/* Stop Suggestions Dropdown */}
                  {stopSuggestions.length > 0 && (
                    <div className="space-y-1 max-h-40 overflow-y-auto pt-1">
                      {stopSuggestions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleAddStop(item)}
                          className="w-full text-left p-1.5 rounded-lg bg-[var(--bg-elevated)] hover:border-[var(--primary-accent)] border border-transparent text-[11px] text-[var(--text-primary)] truncate transition-colors cursor-pointer"
                        >
                          <div className="font-semibold">{item.label}</div>
                          <div className="text-[10px] text-[var(--text-muted)] truncate">{item.displayName}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Preset quick picks */}
                  <div className="pt-1">
                    <span className="text-[10px] text-[var(--text-muted)] block mb-1">Or pick quick location:</span>
                    <div className="grid grid-cols-1 gap-1">
                      {COMMON_PLACES.slice(0, 3).map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => handleAddStop(p)}
                          className="text-left p-1.5 rounded-lg card-level-3 hover:border-[var(--primary-accent)] text-[11px] text-[var(--text-primary)] truncate transition-colors cursor-pointer"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Final Destination Search */}
              <div className="relative">
                <span className="block text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1 font-semibold">
                  Final Destination (OpenStreetMap / Search Any Place)
                </span>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={destinationQuery}
                    onChange={(e) => handleDestinationQueryChange(e.target.value)}
                    onFocus={() => setShowDestDropdown(true)}
                    placeholder="Search any place, airport, city, street in Tamil Nadu..."
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] focus:border-[var(--primary-accent)] rounded-xl pl-8 pr-8 py-2 text-xs text-[var(--text-primary)] outline-none"
                  />
                  {destSearching && (
                    <Loader2 className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-[var(--primary-accent)] animate-spin" />
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {showDestDropdown && destSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl shadow-2xl p-1 max-h-56 overflow-y-auto">
                    {destSuggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setDestinationQuery(item.label);
                          setDestLat(item.lat);
                          setDestLng(item.lng);
                          setShowDestDropdown(false);
                        }}
                        className="w-full text-left p-2 rounded-lg hover:bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] transition-colors cursor-pointer"
                      >
                        <div className="font-semibold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-[var(--primary-accent)]" />
                          <span>{item.label}</span>
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] pl-4 truncate">{item.displayName}</div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Quick Presets */}
                <div className="mt-2 space-y-1">
                  <span className="text-[10px] text-[var(--text-muted)] block">Frequent Destination Corridors:</span>
                  <div className="space-y-1">
                    {COMMON_PLACES.slice(0, 3).map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          setDestinationQuery(p.label);
                          setDestLat(p.lat);
                          setDestLng(p.lng);
                          setShowDestDropdown(false);
                        }}
                        className={`w-full text-left p-2 rounded-lg text-[11px] truncate transition-colors cursor-pointer border ${
                          destLat === p.lat && destLng === p.lng
                            ? "bg-[var(--bg-elevated)] border-[var(--primary-accent)] text-[var(--primary-accent)] font-semibold"
                            : "bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={calculating}
                onClick={handleCalculateRoute}
                className="btn-primary w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                <Route className="w-3.5 h-3.5" />
                {calculating ? "Calculating OSRM Route..." : "Recalculate Route"}
              </button>

              {routeError && (
                <div className="p-2.5 rounded-lg bg-[var(--danger)]/15 border border-[var(--danger)]/30 text-xs text-[var(--danger)] flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{routeError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Area: Interactive MapLibre Route & Journey Timeline */}
          <div className="lg:col-span-2 space-y-4">
            {/* Interactive MapLibre GL Map displaying the active route geometry */}
            {/* Interactive MapLibre GL Map displaying the active route geometry */}
            <div className="card-level-2 rounded-2xl overflow-hidden p-1">
              <MapLibreEvMap
                stations={stations}
                chargers={chargers}
                prices={prices}
                queues={queues}
                recommendedStationId={routePlan?.recommendedStops?.[0]?.station?.id}
                recommendedStationIds={routePlan?.recommendedStops?.map((s) => s.station.id) || []}
                startLocation={startLocation}
                vehicleLocation={
                  startLocation
                    ? { lat: startLocation.lat, lng: startLocation.lng }
                    : undefined
                }
                destinationLocation={destLat && destLng ? { lat: destLat, lng: destLng, label: destinationQuery } : undefined}
                routeGeometry={routePlan?.geometry || null}
                userRangeKm={vehicle?.estimatedRangeKm || 160}
                initialCenter={
                  startLocation
                    ? { lat: startLocation.lat, lng: startLocation.lng }
                    : { lat: 22.5, lng: 79.0 }
                }
                initialZoom={startLocation ? 12 : 4.6}
                onLocationUpdate={(coords) => {
                  setStartLocation({
                    lat: coords.lat,
                    lng: coords.lng,
                    name: "Current location",
                    source: "GPS",
                  });
                  setStartInputText("");
                  setGpsErrorNotice(null);
                }}
              />
            </div>

            {routePlan ? (
              <div className="space-y-4">
                {/* Metrics Ticker */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="card-level-2 p-3.5 rounded-xl">
                    <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-medium">Total Distance</span>
                    <span className="text-xl font-bold text-[var(--text-primary)] mt-0.5 block">
                      {routePlan.totalDistanceKm} km
                    </span>
                  </div>

                  <div className="card-level-2 p-3.5 rounded-xl">
                    <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-medium">Estimated Drive Time</span>
                    <span className="text-xl font-bold text-[var(--info)] mt-0.5 block flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {routePlan.estimatedDriveTimeMin} mins
                    </span>
                  </div>

                  <div className="card-level-2 p-3.5 rounded-xl">
                    <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-medium">Battery Required</span>
                    <span className="text-xl font-bold text-[var(--warning)] mt-0.5 block flex items-center gap-1">
                      <Zap className="w-4 h-4" />
                      {routePlan.batteryRequiredKwh} kWh
                    </span>
                  </div>

                  <div className="card-level-2 p-3.5 rounded-xl">
                    <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-medium">Projected Arrival</span>
                    <span
                      className={`text-xl font-bold mt-0.5 block flex items-center gap-1 ${
                        routePlan.unreachableJourney
                          ? "text-[var(--danger)]"
                          : routePlan.projectedBatteryAtDestination >= 15
                          ? "text-[var(--primary-accent)]"
                          : "text-[var(--warning)]"
                      }`}
                    >
                      <Battery className="w-4 h-4" />
                      {routePlan.unreachableJourney
                        ? "0% (Unreachable)"
                        : `~${routePlan.projectedBatteryAtDestination}%`}
                    </span>
                  </div>
                </div>

                {/* Reachability Status Banner */}
                {routePlan.unreachableJourney ? (
                  <div className="p-4 rounded-xl border flex items-center justify-between gap-3 text-xs bg-[var(--danger)]/15 border-[var(--danger)]/40 text-[var(--danger)] shadow-lg">
                    <div className="flex items-center gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-[var(--danger)] flex-shrink-0" />
                      <div>
                        <strong className="block text-sm">⚠ CHARGING REQUIRED — UNREACHABLE ROUTE</strong>
                        <span className="text-[11px] text-[var(--text-secondary)] mt-0.5 block">
                          {routePlan.statusMessage || `Your current battery (${routePlan.startingBattery}%) is insufficient to reach the destination while maintaining the 15% safety reserve. No compatible charging station was found within safe range.`}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : routePlan.chargingRequired ? (
                  <div className="p-4 rounded-xl border flex items-center justify-between gap-3 text-xs bg-[var(--warning)]/10 border-[var(--warning)]/30 text-[var(--text-primary)]">
                    <div className="flex items-center gap-2.5">
                      <Zap className="w-5 h-5 text-[var(--warning)] flex-shrink-0" />
                      <div>
                        <strong className="block text-sm text-[var(--text-primary)]">
                          Corridor Charging Required ({routePlan.chargingStopsNeeded} Stop{routePlan.chargingStopsNeeded !== 1 ? "s" : ""})
                        </strong>
                        <span className="text-[11px] text-[var(--text-secondary)] mt-0.5 block">
                          {routePlan.statusMessage}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border flex items-center justify-between gap-3 text-xs bg-[var(--primary-accent)]/10 border-[var(--primary-accent)]/30 text-[var(--text-primary)]">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-[var(--primary-accent)] flex-shrink-0" />
                      <div>
                        <strong className="block text-sm">✓ Destination Directly Reachable Without Stopping</strong>
                        <span className="text-[11px] text-[var(--text-secondary)] mt-0.5 block">
                          {routePlan.statusMessage || `Projected arrival battery of ${routePlan.projectedBatteryAtDestination}% is comfortably above the 15% safety buffer.`}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Charging Plan Section: Displays all recommended stops */}
                {routePlan.recommendedStops && routePlan.recommendedStops.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                        <Zap className="w-4 h-4 text-[var(--primary-accent)]" />
                        CHARGING PLAN ({routePlan.recommendedStops.length} Corridor Stop{routePlan.recommendedStops.length !== 1 ? "s" : ""})
                      </h3>
                      <span className="text-xs text-[var(--text-muted)]">
                        Enforcing minimum 15% safe arrival buffer
                      </span>
                    </div>

                    {routePlan.recommendedStops.map((stop, idx) => (
                      <div key={stop.station.id + "_" + idx} className="card-level-1 p-5 rounded-2xl space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)]">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-[var(--primary-accent)] text-[#0E100F] font-bold text-xs flex items-center justify-center flex-shrink-0">
                              {idx + 1}
                            </span>
                            <div>
                              <h4 className="font-bold text-sm text-[var(--text-primary)]">
                                Stop #{idx + 1}: {stop.station.name}
                              </h4>
                              <span className="text-[11px] text-[var(--text-secondary)]">
                                {stop.station.operator} • {stop.station.address}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <span className="text-xs font-bold text-[var(--primary-accent)] px-2.5 py-1 rounded-full bg-[var(--primary-accent)]/15 border border-[var(--primary-accent)]/30">
                              {stop.chargeTimeMin} min stop • {stop.chargerPowerKw} kW DC
                            </span>
                          </div>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                            <span className="text-[10px] text-[var(--text-muted)] block uppercase font-medium">Distance from Start</span>
                            <span className="text-sm font-bold text-[var(--text-primary)] mt-0.5 block">
                              {stop.distanceAlongRouteKm} km
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                            <span className="text-[10px] text-[var(--text-muted)] block uppercase font-medium">Highway Detour</span>
                            <span className="text-sm font-bold text-[var(--text-primary)] mt-0.5 block">
                              {stop.detourKm ? `${stop.detourKm} km` : "Direct on Route"}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                            <span className="text-[10px] text-[var(--text-muted)] block uppercase font-medium">Battery at Arrival</span>
                            <span className="text-sm font-bold text-[var(--warning)] mt-0.5 block">
                              {stop.arrivalBattery}% SoC
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                            <span className="text-[10px] text-[var(--text-muted)] block uppercase font-medium">Target Charge</span>
                            <span className="text-sm font-bold text-[var(--primary-accent)] mt-0.5 block">
                              {stop.targetBattery}% SoC
                            </span>
                          </div>
                        </div>

                        {/* Why this stop? Evidence-based explanation */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                            Why this stop?
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[var(--text-secondary)]">
                            {stop.reasons && stop.reasons.length > 0 ? (
                              stop.reasons.map((reason, rIdx) => (
                                <div key={rIdx} className="flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--primary-accent)] flex-shrink-0" />
                                  <span>{reason}</span>
                                </div>
                              ))
                            ) : (
                              <>
                                <div className="flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--primary-accent)]" />
                                  <span>{vehicle?.connectorType || "CCS2"} compatible fast charging port</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--primary-accent)]" />
                                  <span>Optimal route corridor placement</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <span className="text-[var(--text-muted)]">
                              Estimated Cost: <strong className="text-[var(--primary-accent)]">₹{stop.estimatedCost}</strong>
                            </span>
                            <span className="text-[var(--text-muted)]">
                              Charge {stop.arrivalBattery}% &rarr; {stop.targetBattery}%
                            </span>
                          </div>

                          <Link
                            href={`/reservations?stationId=${stop.station.id}`}
                            className="btn-primary px-3.5 py-1.5 rounded-xl font-bold text-xs"
                          >
                            Reserve Charger Slot
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Journey Timeline */}
                <div className="card-level-2 p-5 rounded-2xl space-y-4">
                  <h4 className="font-bold text-sm text-[var(--text-primary)]">
                    Journey Corridor Sequence
                  </h4>

                  <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--border-subtle)] text-xs">
                    {/* Leg 1: Origin */}
                    <div className="relative">
                      <span className="absolute -left-6 top-0.5 w-3 h-3 rounded-full bg-[var(--info)] border-2 border-[var(--bg-surface)]"></span>
                      <strong className="text-[var(--text-primary)] block">
                        Origin: {startLocation?.name || (routePlan.origin as any)?.name || (routePlan.origin as any)?.label || "Starting Point"}
                      </strong>
                      <span className="text-[11px] text-[var(--text-secondary)]">Battery SoC: {vehicle?.currentBatteryPercentage || 45}%</span>
                    </div>

                    {/* Intermediate stops if any */}
                    {stops.map((st, i) => (
                      <div key={st.id} className="relative">
                        <span className="absolute -left-6 top-0.5 w-3 h-3 rounded-full bg-[var(--text-muted)] border-2 border-[var(--bg-surface)]"></span>
                        <strong className="text-[var(--text-primary)] block">Waypoint {i + 1}: {st.label}</strong>
                        <span className="text-[11px] text-[var(--text-secondary)]">Scheduled intermediate stop</span>
                      </div>
                    ))}

                    {/* Recommended charging stops along corridor */}
                    {routePlan.recommendedStops &&
                      routePlan.recommendedStops.map((stop, idx) => (
                        <div key={stop.station.id + "_" + idx} className="relative">
                          <span className="absolute -left-6 top-0.5 w-3 h-3 rounded-full bg-[var(--primary-accent)] border-2 border-[var(--bg-surface)]"></span>
                          <strong className="text-[var(--primary-accent)] block">
                            ⚡ Charging Stop #{idx + 1}: {stop.station.name} (km {stop.distanceAlongRouteKm})
                          </strong>
                          <span className="text-[11px] text-[var(--text-secondary)]">
                            {stop.chargeTimeMin} mins charging ({stop.chargerPowerKw} kW DC) • Arrive: {stop.arrivalBattery}% &rarr; Depart: {stop.targetBattery}%
                          </span>
                        </div>
                      ))}

                    {/* Destination */}
                    <div className="relative">
                      <span className="absolute -left-6 top-0.5 w-3 h-3 rounded-full bg-[var(--primary-accent)] border-2 border-[var(--bg-surface)]"></span>
                      <strong className="text-[var(--text-primary)] block">Final Destination: {destinationQuery}</strong>
                      <span className="text-[11px] text-[var(--text-secondary)]">
                        {routePlan.unreachableJourney
                          ? "Destination currently unreachable without prior charging."
                          : `Arrival Battery Buffer: ~${routePlan.projectedBatteryAtDestination}%`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card-level-2 p-12 text-center text-xs text-[var(--text-secondary)] rounded-2xl flex flex-col items-center justify-center space-y-2">
                <Navigation className="w-8 h-8 text-[var(--text-muted)] opacity-60" />
                <span className="font-semibold text-sm text-[var(--text-primary)]">
                  {!startLocation
                    ? "Acquiring your starting location..."
                    : "Ready to Plan Trip"}
                </span>
                <span className="text-[var(--text-secondary)] max-w-sm">
                  {!startLocation
                    ? "Allow browser GPS access or search for an origin location above to begin route planning."
                    : "Select your destination to calculate corridor energy consumption and discover charger recommendations along your route."}
                </span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
