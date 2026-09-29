"use client";

import React, { useState, useEffect } from "react";
import {
  Sliders,
  X,
  Battery,
  MapPin,
  Navigation,
  Zap,
  Activity,
  CheckCircle2,
  RefreshCw,
  LocateFixed,
  AlertTriangle,
} from "lucide-react";

interface EvSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplied?: () => void;
  initialBattery?: number;
  initialLat?: number;
  initialLng?: number;
}

const LOCATION_PRESETS = [
  { name: "T. Nagar, Chennai", lat: 13.0418, lng: 80.2341 },
  { name: "Guindy (Olympia Tech Park)", lat: 13.0102, lng: 80.2038 },
  { name: "Chennai Airport (MAA)", lat: 12.9815, lng: 80.1636 },
  { name: "Sholinganallur OMR Corridor", lat: 12.9010, lng: 80.2279 },
  { name: "Tambaram Junction", lat: 12.9249, lng: 80.1000 },
  { name: "Sriperumbudur Highway (NH48)", lat: 12.9863, lng: 79.9482 },
];

export function EvSimulationModal({
  isOpen,
  onClose,
  onApplied,
  initialBattery = 35,
  initialLat = 13.0418,
  initialLng = 80.2341,
}: EvSimulationModalProps) {
  const [battery, setBattery] = useState(initialBattery);
  const [chargingStatus, setChargingStatus] = useState("IDLE");
  const [chargingPowerKw, setChargingPowerKw] = useState(0);
  const [speedKmH, setSpeedKmH] = useState(0);
  const [drainRateWhKm, setDrainRateWhKm] = useState(145);
  const [selectedLocationName, setSelectedLocationName] = useState("T. Nagar, Chennai");
  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const [destination, setDestination] = useState("Phoenix Marketcity, Velachery");
  const [destSuggestions, setDestSuggestions] = useState<any[]>([]);
  const [destSearching, setDestSearching] = useState(false);
  const destTimeout = React.useRef<NodeJS.Timeout | null>(null);
  const [scenarioId, setScenarioId] = useState("none");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleDestinationSearch = (val: string) => {
    setDestination(val);
    if (destTimeout.current) clearTimeout(destTimeout.current);
    if (val.trim().length < 2) {
      setDestSuggestions([]);
      setDestSearching(false);
      return;
    }
    setDestSearching(true);
    destTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(val)}`);
        const data = await res.json();
        if (data.results) setDestSuggestions(data.results);
      } catch (err) {
        console.warn("Geocode error in simulation modal:", err);
      } finally {
        setDestSearching(false);
      }
    }, 350);
  };

  useEffect(() => {
    setBattery(initialBattery);
    setLat(initialLat);
    setLng(initialLng);
  }, [initialBattery, initialLat, initialLng]);

  if (!isOpen) return null;

  const estimatedRange = Math.round((battery / 100) * 340);

  const handleApply = async () => {
    setSaving(true);
    setSuccessMsg(null);

    try {
      // 1. Update vehicle state
      await fetch("/api/vehicle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batteryPercentage: battery,
          estimatedRangeKm: estimatedRange,
          currentLatitude: lat,
          currentLongitude: lng,
          chargingStatus: chargingStatus === "IDLE" ? "IDLE" : "CHARGING",
          connectionMode: "SIMULATION",
        }),
      });

      // 2. Update network scenario if selected
      if (scenarioId !== "none") {
        await fetch("/api/demo/scenario", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenarioId }),
        });
      }

      setSuccessMsg("Simulation applied. Telemetry and route intelligence updated.");
      setTimeout(() => {
        setSuccessMsg(null);
        if (onApplied) onApplied();
        onClose();
      }, 900);
    } catch (err) {
      console.error("Simulation apply error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleUseBrowserGps = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(Number(pos.coords.latitude.toFixed(4)));
          setLng(Number(pos.coords.longitude.toFixed(4)));
          setSelectedLocationName(`Device GPS (${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)})`);
        },
        () => {
          alert("Could not access device GPS. Defaulting to Chennai Metro location.");
        }
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="card-level-2 max-w-2xl w-full p-6 sm:p-7 rounded-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto border-[var(--border-subtle)] space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[var(--primary-accent)]/15 text-[var(--primary-accent)] border border-[var(--primary-accent)]/30">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                EV Simulation Control Center
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Configure simulated battery state, geographic coordinates, and network load.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {successMsg && (
          <div className="p-3 rounded-xl bg-[var(--primary-accent)]/15 border border-[var(--primary-accent)]/30 text-xs text-[var(--primary-accent)] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Section 1: Battery Telemetry Controls */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
              <Battery className="w-3.5 h-3.5 text-[var(--primary-accent)]" />
              1. Battery Percentage & Estimated Range
            </label>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="font-bold text-sm text-[var(--primary-accent)]">{battery}%</span>
              <span className="text-[var(--text-muted)]">({estimatedRange} km range)</span>
            </div>
          </div>

          <input
            type="range"
            min="1"
            max="100"
            value={battery}
            onChange={(e) => setBattery(Number(e.target.value))}
            className="w-full h-2 bg-[var(--bg-elevated)] rounded-lg appearance-none cursor-pointer accent-[var(--primary-accent)]"
          />

          <div className="flex flex-wrap gap-1.5 pt-1">
            {[
              { label: "8% (Critical)", val: 8 },
              { label: "18% (Low)", val: 18 },
              { label: "35% (Medium)", val: 35 },
              { label: "60% (Healthy)", val: 60 },
              { label: "85% (High)", val: 85 },
            ].map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => setBattery(p.val)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
                  battery === p.val
                    ? "bg-[var(--primary-accent)] text-[#0E100F]"
                    : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Charging State & Power */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Charging State
            </label>
            <select
              value={chargingStatus}
              onChange={(e) => setChargingStatus(e.target.value)}
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] outline-none"
            >
              <option value="IDLE">Not Charging</option>
              <option value="CHARGING">Fast Charging (Active)</option>
              <option value="COMPLETED">Charging Complete (100%)</option>
              <option value="PAUSED">Charging Paused / Scheduled</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Charging Power (EVSE Output)
            </label>
            <div className="grid grid-cols-4 gap-1">
              {[0, 22, 60, 120].map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => setChargingPowerKw(kw)}
                  className={`py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                    chargingPowerKw === kw
                      ? "bg-[var(--primary-accent)] text-[#0E100F]"
                      : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                  }`}
                >
                  {kw} kW
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 3: Vehicle Location Simulator */}
        <div className="space-y-3 pt-2 border-t border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[var(--info)]" />
              2. Vehicle Location Simulation
            </label>
            <button
              type="button"
              onClick={handleUseBrowserGps}
              className="text-[11px] text-[var(--info)] hover:underline flex items-center gap-1 cursor-pointer font-medium"
            >
              <LocateFixed className="w-3 h-3" /> Use Device GPS
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {LOCATION_PRESETS.map((loc) => {
              const isSelected = lat === loc.lat && lng === loc.lng;
              return (
                <button
                  key={loc.name}
                  type="button"
                  onClick={() => {
                    setLat(loc.lat);
                    setLng(loc.lng);
                    setSelectedLocationName(loc.name);
                  }}
                  className={`p-2 rounded-xl text-left text-xs transition-colors cursor-pointer border ${
                    isSelected
                      ? "bg-[var(--bg-elevated)] border-[var(--primary-accent)] text-[var(--primary-accent)] font-semibold"
                      : "bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span className="block truncate text-[11px]">{loc.name}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-[var(--text-muted)] block mb-0.5">Latitude</span>
              <input
                type="number"
                step="0.0001"
                value={lat}
                onChange={(e) => setLat(Number(e.target.value))}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none font-mono"
              />
            </div>
            <div>
              <span className="text-[10px] text-[var(--text-muted)] block mb-0.5">Longitude</span>
              <input
                type="number"
                step="0.0001"
                value={lng}
                onChange={(e) => setLng(Number(e.target.value))}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Destination & Network Conditions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--border-subtle)]">
          <div className="relative">
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Simulated Destination Place (Search via OpenStreetMap)
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => handleDestinationSearch(e.target.value)}
              placeholder="e.g. Phoenix Marketcity, Chennai Airport, Marina Beach"
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] focus:border-[var(--primary-accent)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] outline-none"
            />
            {destSearching && (
              <span className="absolute right-3 top-8 text-[10px] text-[var(--primary-accent)]">Searching...</span>
            )}
            {destSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl shadow-2xl p-1 max-h-40 overflow-y-auto">
                {destSuggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setDestination(item.label);
                      setDestSuggestions([]);
                    }}
                    className="w-full text-left p-1.5 rounded-lg hover:bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] transition-colors cursor-pointer truncate"
                  >
                    <span className="font-semibold block truncate">{item.label}</span>
                    <span className="text-[10px] text-[var(--text-muted)] truncate block">{item.displayName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Simulated Network Congestion
            </label>
            <select
              value={scenarioId}
              onChange={(e) => setScenarioId(e.target.value)}
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] outline-none"
            >
              <option value="none">Nominal Baseline (Real grid state)</option>
              <option value="scenario-1">Low Battery Emergency Alert</option>
              <option value="scenario-2">Congested Nearest Station (32m Queue)</option>
              <option value="scenario-3">City-Wide Evening Peak Congestion</option>
              <option value="scenario-5">Charger Offline / Hardware Fault</option>
            </select>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
          <span className="text-[10px] text-[var(--text-muted)]">
            Simulation explicitly tags vehicle telemetry as SIMULATION mode.
          </span>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleApply}
              className="btn-primary px-5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {saving ? "Applying..." : "Apply Simulation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
