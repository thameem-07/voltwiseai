"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Zap,
  Navigation,
  Flame,
  X,
  Plus,
  Minus,
  AlertTriangle,
} from "lucide-react";
import { ChargingStation, Charger, StationPrice, QueueEntry } from "@/types";

interface EvMapProps {
  stations: ChargingStation[];
  chargers: Charger[];
  prices: StationPrice[];
  queues: QueueEntry[];
  recommendedStationId?: string;
  vehicleLocation?: { lat: number; lng: number };
  highlightedStationId?: string;
  onSelectStation?: (station: ChargingStation) => void;
}

export function EvMap({
  stations,
  chargers,
  prices,
  queues,
  recommendedStationId,
  vehicleLocation = { lat: 13.0382, lng: 80.2458 },
  highlightedStationId,
  onSelectStation,
}: EvMapProps) {
  const [selectedStationId, setSelectedStationId] = useState<string | null>(highlightedStationId || null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [filterSpeed, setFilterSpeed] = useState<"ALL" | "FAST" | "ULTRA">("ALL");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // Map geographic bounding box for Chennai metro
  const minLat = 12.80;
  const maxLat = 13.15;
  const minLng = 79.90;
  const maxLng = 80.30;

  const projectCoordinates = (lat: number, lng: number) => {
    const x = ((lng - minLng) / (maxLng - minLng)) * 100;
    const y = ((maxLat - lat) / (maxLat - minLat)) * 100;
    return { x: Math.max(3, Math.min(97, x)), y: Math.max(3, Math.min(97, y)) };
  };

  const selectedStation = useMemo(() => {
    return stations.find((s) => s.id === selectedStationId) || null;
  }, [stations, selectedStationId]);

  const selectedChargers = useMemo(() => {
    if (!selectedStation) return [];
    return chargers.filter((c) => c.stationId === selectedStation.id);
  }, [selectedStation, chargers]);

  const selectedPrice = useMemo(() => {
    if (!selectedStation) return null;
    return prices.find((p) => p.stationId === selectedStation.id);
  }, [selectedStation, prices]);

  const selectedQueues = useMemo(() => {
    if (!selectedStation) return [];
    return queues.filter((q) => q.stationId === selectedStation.id && q.status === "WAITING");
  }, [selectedStation, queues]);

  const filteredStations = useMemo(() => {
    return stations.filter((stn) => {
      const stnChargers = chargers.filter((c) => c.stationId === stn.id);
      if (filterSpeed === "ULTRA") return stnChargers.some((c) => c.powerKw >= 100);
      if (filterSpeed === "FAST") return stnChargers.some((c) => c.powerKw >= 50);
      return true;
    });
  }, [stations, chargers, filterSpeed]);

  const vehicleCoords = projectCoordinates(vehicleLocation.lat, vehicleLocation.lng);

  return (
    <div className="relative w-full h-[620px] rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] overflow-hidden select-none transition-colors duration-200">
      {/* Top Map Toolbar */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
        <div className="flex items-center bg-[var(--bg-surface)]/90 backdrop-blur-md p-1 rounded-xl border border-[var(--border-subtle)] text-xs shadow-xs">
          <button
            onClick={() => setFilterSpeed("ALL")}
            className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              filterSpeed === "ALL"
                ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold border border-[var(--border-subtle)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            All Speeds
          </button>
          <button
            onClick={() => setFilterSpeed("FAST")}
            className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              filterSpeed === "FAST"
                ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold border border-[var(--border-subtle)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Fast (≥50 kW)
          </button>
          <button
            onClick={() => setFilterSpeed("ULTRA")}
            className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              filterSpeed === "ULTRA"
                ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold border border-[var(--border-subtle)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Ultra-Fast (≥100 kW)
          </button>
        </div>

        {/* Heatmap Toggle */}
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold backdrop-blur-md border transition-all cursor-pointer shadow-xs ${
            showHeatmap
              ? "bg-[var(--danger)] text-white border-[var(--danger)]"
              : "bg-[var(--bg-surface)]/90 text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>{showHeatmap ? "Heatmap Active" : "Congestion Heatmap"}</span>
        </button>
      </div>

      {/* Zoom / Navigation Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-1 bg-[var(--bg-surface)]/90 backdrop-blur-md p-1 rounded-xl border border-[var(--border-subtle)] shadow-xs">
        <button
          onClick={() => setZoomLevel((z) => Math.min(1.6, z + 0.2))}
          className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] cursor-pointer"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.2))}
          className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] cursor-pointer"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            setZoomLevel(1);
            setPanOffset({ x: 0, y: 0 });
          }}
          className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--primary-accent)] hover:bg-[var(--bg-elevated)] cursor-pointer"
          title="Recenter"
        >
          <Navigation className="w-4 h-4" />
        </button>
      </div>

      {/* Map Graphics Canvas */}
      <div
        className="w-full h-full relative cursor-grab active:cursor-grabbing transition-transform duration-300"
        style={{
          transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
        }}
      >
        <svg className="w-full h-full absolute inset-0" preserveAspectRatio="none">
          <defs>
            <linearGradient id="coastGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--border-subtle)" stopOpacity="0.1" />
              <stop offset="100%" stopColor="var(--info)" stopOpacity="0.15" />
            </linearGradient>
            <filter id="blurHeat">
              <feGaussianBlur stdDeviation="30" />
            </filter>
          </defs>

          {/* Bay of Bengal Coastline */}
          <path
            d="M 85,0 Q 82,30 84,60 T 88,100 L 100,100 L 100,0 Z"
            fill="url(#coastGrad)"
            stroke="var(--border-subtle)"
            strokeWidth="0.5"
          />

          {/* Chennai Arterials */}
          <path
            d="M 30,10 Q 55,45 80,75"
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth="1.5"
            strokeDasharray="4 2"
            opacity="0.4"
          />
          <path
            d="M 50,5 Q 60,50 78,95"
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth="2"
            opacity="0.5"
          />
          <path
            d="M 15,45 L 85,45"
            fill="none"
            stroke="var(--border-subtle)"
            strokeWidth="1.2"
            opacity="0.3"
          />

          {/* Heatmap Overlay Blobs */}
          {showHeatmap && (
            <g filter="url(#blurHeat)" opacity="0.6">
              <circle cx="60%" cy="45%" r="18%" fill="var(--danger)" opacity="0.85" />
              <circle cx="52%" cy="58%" r="16%" fill="var(--warning)" opacity="0.8" />
              <circle cx="70%" cy="75%" r="14%" fill="var(--primary-accent)" opacity="0.75" />
              <circle cx="45%" cy="30%" r="15%" fill="var(--warning)" opacity="0.8" />
            </g>
          )}
        </svg>

        {/* Vehicle Current Position Marker */}
        <div
          className="absolute z-10 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${vehicleCoords.x}%`, top: `${vehicleCoords.y}%` }}
        >
          <div className="relative flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-7 w-7 rounded-full bg-[var(--info)] opacity-50"></span>
            <div className="w-5 h-5 rounded-full bg-[var(--info)] border-2 border-[var(--bg-surface)] shadow-md flex items-center justify-center text-[10px] text-white font-bold">
              ⚡
            </div>
            <span className="absolute top-5 whitespace-nowrap bg-[var(--bg-surface)] text-[var(--info)] border border-[var(--border-subtle)] text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
              My EV
            </span>
          </div>
        </div>

        {/* Station Markers */}
        {filteredStations.map((station) => {
          const coords = projectCoordinates(station.latitude, station.longitude);
          const stnChargers = chargers.filter((c) => c.stationId === station.id);
          const stnQueues = queues.filter((q) => q.stationId === station.id && q.status === "WAITING");
          const availCount = stnChargers.filter((c) => c.status === "AVAILABLE").length;
          const isFaulted = stnChargers.some((c) => c.status === "FAULTED");
          const isRecommended = station.id === recommendedStationId;
          const isSelected = station.id === selectedStationId;

          // Semantic colors: Green = Available, Amber = Busy, Red = Full/Fault
          let markerBg = "var(--primary-accent)";
          let markerFg = "var(--primary-accent-fg)";

          if (isFaulted) {
            markerBg = "var(--danger)";
            markerFg = "#FFFFFF";
          } else if (availCount === 0) {
            markerBg = "var(--danger)";
            markerFg = "#FFFFFF";
          } else if (availCount <= 1 || stnQueues.length > 0) {
            markerBg = "var(--warning)";
            markerFg = "#151817";
          }

          return (
            <div
              key={station.id}
              onClick={() => {
                setSelectedStationId(station.id);
                if (onSelectStation) onSelectStation(station);
              }}
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
              style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
            >
              <div className="relative flex flex-col items-center">
                {/* Subtle Recommended Ring Effect */}
                {isRecommended && (
                  <span className="animate-ping absolute inline-flex h-9 w-9 rounded-full bg-[var(--primary-accent)] opacity-40"></span>
                )}

                {/* Marker Pin */}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-transform group-hover:scale-120 border-2 ${
                    isSelected ? "border-[var(--text-primary)] scale-110" : "border-[var(--bg-surface)]"
                  }`}
                  style={{ backgroundColor: markerBg, color: markerFg }}
                >
                  {isFaulted ? (
                    <AlertTriangle className="w-3 h-3" />
                  ) : (
                    <Zap className="w-3 h-3 fill-current" />
                  )}
                </div>

                {/* Quick Info Pill */}
                <div
                  className={`mt-1 text-[10px] px-2 py-0.5 rounded-full font-semibold shadow-xs whitespace-nowrap border transition-all ${
                    isSelected
                      ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]"
                      : "bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-subtle)] group-hover:border-[var(--border-strong)]"
                  }`}
                >
                  <span className="truncate max-w-[100px] inline-block align-bottom font-medium">
                    {station.name.split("—")[0].trim()}
                  </span>
                  <span className="ml-1 text-[9px] font-bold" style={{ color: markerBg }}>
                    {availCount} free
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Station Drawer / Detail Card */}
      {selectedStation && (
        <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-30 card-level-1 rounded-2xl p-4 shadow-xl text-[var(--text-primary)] transition-all">
          <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[var(--border-subtle)]">
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-bold text-sm text-[var(--text-primary)]">{selectedStation.name}</h4>
                {selectedStation.id === recommendedStationId && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-[var(--primary-accent)] text-[var(--primary-accent-fg)]">
                    RECOMMENDED
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{selectedStation.address}</p>
            </div>
            <button
              onClick={() => setSelectedStationId(null)}
              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="card-level-3 p-2 rounded-lg">
              <span className="text-[10px] text-[var(--text-muted)] block">Available</span>
              <span className="font-bold text-[var(--text-primary)]">
                {selectedChargers.filter((c) => c.status === "AVAILABLE").length} / {selectedChargers.length}
              </span>
            </div>
            <div className="card-level-3 p-2 rounded-lg">
              <span className="text-[10px] text-[var(--text-muted)] block">Queue</span>
              <span className="font-bold text-[var(--text-primary)]">
                {selectedQueues.length === 0 ? "0 min" : `~${selectedQueues.length * 7}m`}
              </span>
            </div>
            <div className="card-level-3 p-2 rounded-lg">
              <span className="text-[10px] text-[var(--text-muted)] block">Tariff</span>
              <span className="font-bold text-[var(--text-primary)]">
                ₹{selectedPrice?.pricePerKwh || 18}/kWh
              </span>
            </div>
          </div>

          {/* EVSE Guns List */}
          <div className="mt-3 space-y-1.5 max-h-24 overflow-y-auto pr-1">
            {selectedChargers.map((chg) => (
              <div
                key={chg.id}
                className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-elevated)] text-xs border border-[var(--border-subtle)]"
              >
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span className="font-medium text-[var(--text-primary)]">{chg.connectorType}</span>
                  <span className="text-[var(--text-secondary)]">({chg.powerKw} kW)</span>
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
                  {chg.status}
                </span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-3 flex items-center gap-2">
            <Link
              href={`/reservations?stationId=${selectedStation.id}`}
              className="flex-1 py-2 text-center rounded-xl btn-primary text-xs font-bold shadow-xs"
            >
              Reserve Charger
            </Link>
            <Link
              href={`/report-fault?stationId=${selectedStation.id}`}
              className="px-3 py-2 rounded-xl btn-secondary text-xs"
            >
              Report
            </Link>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-20 hidden md:flex items-center gap-3 bg-[var(--bg-surface)]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] shadow-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--primary-accent)]"></span>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--warning)]"></span>
          <span>Busy</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--danger)]"></span>
          <span>Full / Fault</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--info)]"></span>
          <span>My EV</span>
        </div>
      </div>
    </div>
  );
}
