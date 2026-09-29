"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { DemoControlBar } from "@/components/demo-control-bar";
import dynamic from "next/dynamic";

const MapLibreEvMap = dynamic(
  () => import("@/components/maplibre-ev-map").then((mod) => mod.MapLibreEvMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[620px] rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col items-center justify-center space-y-3">
        <div className="w-6 h-6 border-2 border-[var(--primary-accent)] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-[var(--text-secondary)] font-medium">
          Loading VoltWise EV Map Engine...
        </span>
      </div>
    ),
  }
);
import {
  MapPin,
  Search,
  Filter,
  Zap,
  Radio,
  Clock,
  IndianRupee,
  Navigation,
} from "lucide-react";
import { ChargingStation, Charger, StationPrice, QueueEntry, Vehicle } from "@/types";

export default function MapPage() {
  const [stations, setStations] = useState<ChargingStation[]>([]);
  const [chargers, setChargers] = useState<Charger[]>([]);
  const [prices, setPrices] = useState<StationPrice[]>([]);
  const [queues, setQueues] = useState<QueueEntry[]>([]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [recommendedId, setRecommendedId] = useState<string | undefined>();
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [selectedRegionFilter, setSelectedRegionFilter] = useState("ALL");
  const [directorySearch, setDirectorySearch] = useState("");
  const [_loading, setLoading] = useState(true);

  // Level 1: Load India Overview Dataset (Server cached)
  const loadData = async () => {
    try {
      const [stnRes, vRes, rRes] = await Promise.all([
        fetch("/api/stations?level=overview"),
        fetch("/api/vehicle"),
        fetch("/api/recommendations"),
      ]);

      const stnData = await stnRes.json();
      const vData = await vRes.json();
      const rData = await rRes.json();

      if (stnData.stations) {
        setStations(stnData.stations);
        const chgList: Charger[] = [];
        const prcList: StationPrice[] = [];
        stnData.stations.forEach((s: ChargingStation & { chargers?: Charger[]; price?: StationPrice }) => {
          if (s.chargers) chgList.push(...s.chargers);
          if (s.price) prcList.push(s.price);
        });
        setChargers(chgList);
        setPrices(prcList);
      }

      if (vData.vehicle) setVehicle(vData.vehicle);
      if (rData.topRecommendation) setRecommendedId(rData.topRecommendation.station.id);
    } catch (err) {
      console.error("Map page load error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Level 2: Viewport-aware progressive detail loading
  const handleViewportChange = async ({
    bounds,
    zoom,
    center,
  }: {
    bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number };
    zoom: number;
    center: { lat: number; lng: number };
  }) => {
    // Only query deeper viewport stations if zoomed into regional/city level (zoom >= 6.5)
    if (zoom < 6.5) return;

    try {
      const queryUrl = `/api/stations?bounds=${bounds.minLng.toFixed(4)},${bounds.minLat.toFixed(4)},${bounds.maxLng.toFixed(4)},${bounds.maxLat.toFixed(4)}&lat=${center.lat.toFixed(4)}&lng=${center.lng.toFixed(4)}&zoom=${Math.round(zoom)}`;
      const res = await fetch(queryUrl);
      const data = await res.json();

      if (data.stations && data.stations.length > 0) {
        setStations((prev) => {
          const map = new Map<string, ChargingStation>();
          prev.forEach((s) => map.set(s.id, s));
          data.stations.forEach((s: ChargingStation) => map.set(s.id, s));
          return Array.from(map.values());
        });

        const newChargers: Charger[] = [];
        const newPrices: StationPrice[] = [];
        data.stations.forEach((s: ChargingStation & { chargers?: Charger[]; price?: StationPrice }) => {
          if (s.chargers) newChargers.push(...s.chargers);
          if (s.price) newPrices.push(s.price);
        });

        if (newChargers.length > 0) {
          setChargers((prev) => {
            const map = new Map<string, Charger>();
            prev.forEach((c) => map.set(c.id, c));
            newChargers.forEach((c) => map.set(c.id, c));
            return Array.from(map.values());
          });
        }

        if (newPrices.length > 0) {
          setPrices((prev) => {
            const map = new Map<string, StationPrice>();
            prev.forEach((p) => map.set(p.stationId, p));
            newPrices.forEach((p) => map.set(p.stationId, p));
            return Array.from(map.values());
          });
        }
      }
    } catch (err) {
      console.warn("Viewport detail query notice:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick region filter lists
  const REGION_OPTIONS = [
    { label: "All India", value: "ALL" },
    { label: "Delhi NCR", value: "Delhi" },
    { label: "Bengaluru", value: "Bengaluru" },
    { label: "Mumbai", value: "Mumbai" },
    { label: "Chennai", value: "Chennai" },
    { label: "Hyderabad", value: "Hyderabad" },
    { label: "Pune", value: "Pune" },
    { label: "Kolkata", value: "Kolkata" },
    { label: "Ahmedabad", value: "Ahmedabad" },
    { label: "Jaipur", value: "Jaipur" },
    { label: "Kochi", value: "Kochi" },
    { label: "Bhopal", value: "Bhopal" },
    { label: "Lucknow", value: "Lucknow" },
  ];

  const filteredDirectoryStations = stations.filter((s) => {
    if (selectedRegionFilter !== "ALL") {
      const matchCity = s.city.toLowerCase().includes(selectedRegionFilter.toLowerCase());
      const matchState = s.state.toLowerCase().includes(selectedRegionFilter.toLowerCase());
      const matchName = s.name.toLowerCase().includes(selectedRegionFilter.toLowerCase());
      if (!matchCity && !matchState && !matchName) return false;
    }
    if (directorySearch.trim()) {
      const q = directorySearch.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchOp = s.operator.toLowerCase().includes(q);
      const matchCity = s.city.toLowerCase().includes(q);
      const matchState = s.state.toLowerCase().includes(q);
      if (!matchName && !matchOp && !matchCity && !matchState) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col pb-24">
      <Navbar />

      <DemoControlBar
        onScenarioChange={loadData}
        currentBattery={vehicle?.currentBatteryPercentage || 45}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[var(--primary-accent)]" />
              All-India EV Charging Network
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
              Open Charge Map discovery, fast chargers, and multi-network tariffs across India.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--primary-accent)] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary-accent)] animate-pulse"></span>
              {stations.length} Active Hubs Across India
            </span>
          </div>
        </div>

        {/* Real Interactive MapLibre GL Map */}
        <MapLibreEvMap
          stations={stations}
          chargers={chargers}
          prices={prices}
          queues={queues}
          recommendedStationId={recommendedId}
          initialCenter={{ lat: 22.5, lng: 79.0 }}
          initialZoom={4.6}
          onViewportChange={handleViewportChange}
          vehicleLocation={{
            lat: vehicle?.currentLatitude || 13.0418,
            lng: vehicle?.currentLongitude || 80.2341,
          }}
          onSelectStation={(id) => setSelectedStation(id)}
          userRangeKm={vehicle?.estimatedRangeKm || 160}
          onLocationUpdate={(loc) => {
            if (vehicle) {
              setVehicle({ ...vehicle, currentLatitude: loc.lat, currentLongitude: loc.lng });
            }
          }}
        />

        {/* Directory Header with Quick Region Filter and Search */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                National Charging Hub Directory ({filteredDirectoryStations.length} of {stations.length})
              </h2>
              <span className="text-xs text-[var(--text-muted)]">
                Verified Open Charge Map & Multi-Network Open Protocols
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search city, operator..."
                  value={directorySearch}
                  onChange={(e) => setDirectorySearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary-accent)] w-48 sm:w-60"
                />
              </div>
            </div>
          </div>

          {/* Quick Region Selector Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {REGION_OPTIONS.map((reg) => (
              <button
                key={reg.value}
                onClick={() => setSelectedRegionFilter(reg.value)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
                  selectedRegionFilter === reg.value
                    ? "bg-[var(--primary-accent)] text-[#0E100F] border-[var(--primary-accent)] font-bold shadow-sm"
                    : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)] hover:border-[var(--primary-accent)]/40"
                }`}
              >
                {reg.label}
              </button>
            ))}
          </div>

          {/* Directory Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredDirectoryStations.slice(0, 24).map((stn) => {
              const isRec = stn.id === recommendedId;
              const stnChargers = chargers.filter((c) => c.stationId === stn.id);
              const availableCount = stnChargers.filter((c) => c.status === "AVAILABLE").length;
              const maxPower = Math.max(...stnChargers.map((c) => c.powerKw), 0);

              return (
                <div
                  key={stn.id}
                  onClick={() => setSelectedStation(stn.id)}
                  className={`p-4 rounded-xl cursor-pointer transition-all ${
                    isRec ? "card-level-1" : "card-level-2"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      {stn.operator}
                    </span>
                    {isRec ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--primary-accent)] text-[#0E100F]">
                        RECOMMENDED
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-[var(--info)]">
                        {stn.city || stn.state || "IN"}
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-xs text-[var(--text-primary)] mt-1.5 line-clamp-1">
                    {stn.name}
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1 mt-0.5">
                    {stn.address}
                  </p>

                  <div className="pt-3 mt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 font-semibold text-[var(--primary-accent)]">
                      <Zap className="w-3.5 h-3.5" />
                      {stn.hasLiveStatus ? `${availableCount}/${stnChargers.length} Available` : `${stnChargers.length} Bays Installed`}
                    </span>

                    <span className="font-bold text-[var(--text-primary)]">
                      {maxPower > 0 ? `${maxPower} kW DC` : "Fast Charger"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredDirectoryStations.length === 0 && (
            <div className="p-8 text-center text-xs text-[var(--text-muted)] bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)]">
              No charging stations found matching &ldquo;{directorySearch || selectedRegionFilter}&rdquo;. Try another search or filter.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
