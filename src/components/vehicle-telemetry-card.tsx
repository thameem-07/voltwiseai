"use client";

import React from "react";
import { Battery, BatteryCharging, Gauge, MapPin, ShieldCheck } from "lucide-react";
import { Vehicle } from "@/types";

interface VehicleCardProps {
  vehicle: Vehicle | null;
  onRefresh?: () => void;
}

export function VehicleTelemetryCard({ vehicle, onRefresh: _onRefresh }: VehicleCardProps) {
  if (!vehicle) {
    return (
      <div className="card-level-2 rounded-xl p-6 bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
        <div className="flex items-center gap-3 text-[var(--text-secondary)] text-sm">
          <Battery className="w-4 h-4 animate-pulse text-[var(--primary-accent)]" />
          <span>Synchronizing vehicle telemetry...</span>
        </div>
      </div>
    );
  }

  const soc = Math.round(vehicle.currentBatteryPercentage);

  // Semantic status determination
  let socStatusLabel = "HEALTHY";
  let barColor = "var(--primary-accent)";
  let textColor = "var(--text-primary)";

  if (soc <= 10) {
    socStatusLabel = "CRITICAL";
    barColor = "var(--danger)";
    textColor = "var(--danger)";
  } else if (soc <= 25) {
    socStatusLabel = "LOW";
    barColor = "var(--warning)";
    textColor = "var(--warning)";
  } else if (soc <= 45) {
    socStatusLabel = "MODERATE";
    barColor = "var(--warning)";
    textColor = "var(--warning)";
  }

  return (
    <div className="card-level-2 rounded-xl p-5 sm:p-6 bg-[var(--bg-surface)] border border-[var(--border-subtle)] transition-colors duration-200">
      {/* Top Header: Vehicle Identity & Connection Mode */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text-primary)]">
              {vehicle.make} {vehicle.model}
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
              {vehicle.year}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-secondary)]">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--primary-accent)]" />
              {vehicle.connectorType}
            </span>
            <span>•</span>
            <span>{vehicle.batteryCapacityKwh} kWh Pack</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[var(--text-muted)]" />
              Chennai Metro
            </span>
          </div>
        </div>

        {/* Semantic Connection Indicator (Section: Vehicle Telemetry) */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {vehicle.connectionMode === "OEM_API" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--bg-elevated)] text-[var(--primary-accent)] border border-[var(--border-subtle)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary-accent)] animate-pulse"></span>
              ● LIVE
            </span>
          )}
          {vehicle.connectionMode === "OBD_DEVICE" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--bg-elevated)] text-[var(--info)] border border-[var(--border-subtle)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--info)]"></span>
              ● OBD
            </span>
          )}
          {vehicle.connectionMode === "MANUAL" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--bg-elevated)] text-[var(--warning)] border border-[var(--border-subtle)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--warning)]"></span>
              ● MANUAL
            </span>
          )}
          {vehicle.connectionMode === "SIMULATION" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]"></span>
              ● SIMULATION
            </span>
          )}
        </div>
      </div>

      {/* Main Metric Row: Dominant Battery SoC & Range */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Dominant Battery SoC */}
        <div className="md:col-span-2 space-y-2.5">
          <div className="flex items-baseline justify-between">
            <div className="flex items-center gap-2">
              {vehicle.chargingStatus === "CHARGING" ? (
                <BatteryCharging className="w-5 h-5 text-[var(--primary-accent)] animate-pulse" />
              ) : (
                <Battery className="w-5 h-5 text-[var(--text-secondary)]" />
              )}
              <span className="text-xs uppercase tracking-wider text-[var(--text-secondary)] font-semibold">
                State of Charge
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)]" style={{ color: textColor }}>
                {soc}%
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                ({socStatusLabel})
              </span>
            </div>
          </div>

          {/* Clean Segmented Progress Bar */}
          <div className="w-full h-3 bg-[var(--bg-elevated)] rounded-full overflow-hidden border border-[var(--border-subtle)]">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${Math.max(4, soc)}%`,
                backgroundColor: barColor,
              }}
            ></div>
          </div>

          <div className="flex justify-between text-[11px] text-[var(--text-muted)] font-mono">
            <span>0%</span>
            <span>Fast Charge Buffer (80%)</span>
            <span>100%</span>
          </div>
        </div>

        {/* Estimated Range & Charging State */}
        <div className="card-level-3 rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-[var(--info)]" />
              Remaining Range
            </span>
            <span className="text-2xl font-bold text-[var(--text-primary)]">
              {vehicle.estimatedRangeKm} <span className="text-xs font-normal text-[var(--text-muted)]">km</span>
            </span>
          </div>

          <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)]">Status:</span>
            <span className={`font-semibold ${vehicle.chargingStatus === "CHARGING" ? "text-[var(--primary-accent)]" : "text-[var(--text-primary)]"}`}>
              {vehicle.chargingStatus === "CHARGING" ? "Charging Active" : "Not Charging"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
