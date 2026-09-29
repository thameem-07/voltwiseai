"use client";

import React, { useState } from "react";
import { Zap, Clock, MapPin, CheckCircle2, ChevronRight, IndianRupee, ShieldCheck, AlertCircle } from "lucide-react";
import { StationRecommendation } from "@/types";

interface RecommendedStationCardProps {
  recommendation: StationRecommendation | null;
  onReserveSuccess?: () => void;
}

export function RecommendedStationCard({
  recommendation,
  onReserveSuccess,
}: RecommendedStationCardProps) {
  const [reserving, setReserving] = useState(false);
  const [reserveModalOpen, setReserveModalOpen] = useState(false);
  const [reserveSuccess, setReserveSuccess] = useState(false);
  const [reserveError, setReserveError] = useState<string | null>(null);

  if (!recommendation) {
    return (
      <div className="card-level-2 rounded-xl p-6 bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
        <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm">
          <Zap className="w-4 h-4 text-[var(--primary-accent)] animate-pulse" />
          <span>Computing optimal charging dispatch...</span>
        </div>
      </div>
    );
  }

  const {
    station,
    chargers,
    price,
    distanceKm,
    estimatedTravelTimeMin,
    estimatedWaitMinutes,
    availableChargersCount,
    bestChargerKw,
    estimatedCostInr,
    reasons,
    canSafelyReach,
  } = recommendation;

  const handleConfirmReservation = async () => {
    try {
      setReserving(true);
      setReserveError(null);

      const targetCharger = chargers.find((c) => c.status === "AVAILABLE") || chargers[0];

      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stationId: station.id,
          chargerId: targetCharger.id,
          durationMinutes: 45,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setReserveError(data.error || "Failed to reserve slot");
        return;
      }

      setReserveSuccess(true);
      setTimeout(() => {
        setReserveModalOpen(false);
        setReserveSuccess(false);
        if (onReserveSuccess) onReserveSuccess();
      }, 1800);
    } catch {
      setReserveError("Network error reserving charger");
    } finally {
      setReserving(false);
    }
  };

  return (
    <>
      {/* Level 1: Primary Feature Card with Subtle Recommended Highlight */}
      <div className="card-level-1 rounded-2xl p-5 sm:p-7 relative overflow-hidden transition-all duration-200">
        {/* Subtle Ambient Radial Highlight */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--spotlight-glow)] rounded-full blur-3xl pointer-events-none"></div>

        {/* Top Header Tag */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              Charging Intelligence
            </span>
            <span className="text-[10px] text-[var(--border-strong)]">•</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--primary-accent)] text-[var(--primary-accent-fg)]">
              RECOMMENDED STATION
            </span>
          </div>

          <span className="text-xs text-[var(--text-muted)] flex items-center gap-1 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--info)]" />
            {station.source}
          </span>
        </div>

        {/* Main Station Header & Distance */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              {station.name}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" />
              {station.address}
            </p>
          </div>

          <div className="flex items-baseline gap-1.5 self-start sm:self-auto">
            <span className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
              {distanceKm}
            </span>
            <span className="text-xs text-[var(--text-secondary)] font-medium">km away</span>
            <span className="text-xs text-[var(--text-muted)]">({estimatedTravelTimeMin}m ETA)</span>
          </div>
        </div>

        {/* 4 Supporting Metrics Grid */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="card-level-3 p-3 rounded-xl">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block font-medium">
              Charger Availability
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`w-2 h-2 rounded-full ${availableChargersCount > 0 ? "bg-[var(--primary-accent)]" : "bg-[var(--danger)]"}`}></span>
              <span className="text-sm font-bold text-[var(--text-primary)]">
                {availableChargersCount} / {chargers.length} Free
              </span>
            </div>
          </div>

          <div className="card-level-3 p-3 rounded-xl">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block font-medium">
              Queue Wait
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <Clock className="w-3.5 h-3.5 text-[var(--warning)]" />
              <span className="text-sm font-bold text-[var(--text-primary)]">
                {estimatedWaitMinutes === 0 ? "No Wait" : `~${estimatedWaitMinutes} min`}
              </span>
            </div>
          </div>

          <div className="card-level-3 p-3 rounded-xl">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block font-medium">
              Charging Speed
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <Zap className="w-3.5 h-3.5 text-[var(--info)]" />
              <span className="text-sm font-bold text-[var(--text-primary)]">
                {bestChargerKw} kW DC
              </span>
            </div>
          </div>

          <div className="card-level-3 p-3 rounded-xl">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block font-medium">
              Estimated Cost
            </span>
            <div className="flex items-center gap-0.5 mt-1">
              <IndianRupee className="w-3.5 h-3.5 text-[var(--text-primary)]" />
              <span className="text-sm font-bold text-[var(--text-primary)]">
                {estimatedCostInr}
              </span>
            </div>
          </div>
        </div>

        {/* WHY THIS STATION? Decision Factors */}
        <div className="mt-5 p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
            <span>Why this station?</span>
            <span className="text-[11px] text-[var(--text-muted)] font-normal">Real-time Decision Logic</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[var(--text-secondary)]">
            {reasons.map((reason, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--primary-accent)] flex-shrink-0" />
                <span className="truncate">{reason}</span>
              </div>
            ))}
          </div>

          {!canSafelyReach && (
            <div className="mt-2 p-2 bg-[var(--bg-surface)] border border-[var(--danger)] rounded-lg text-xs text-[var(--danger)] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Drive conservatively: remaining battery range is close to arrival distance.</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => setReserveModalOpen(true)}
            className="w-full sm:flex-1 py-3 px-5 rounded-xl btn-primary text-sm flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-current" />
            Reserve Charger Slot
          </button>

          <a
            href={`/map?stationId=${station.id}`}
            className="w-full sm:w-auto py-3 px-5 rounded-xl btn-secondary text-sm flex items-center justify-center gap-2"
          >
            <MapPin className="w-4 h-4 text-[var(--info)]" />
            Navigate on Map
            <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
          </a>
        </div>
      </div>

      {/* Reservation & Demo Payment Modal */}
      {reserveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl max-w-md w-full p-6 text-[var(--text-primary)] relative shadow-2xl transition-colors duration-200">
            <h3 className="text-lg font-bold">Dynamic Charger Reservation</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Guaranteed slot with 15-minute arrival grace window.
            </p>

            <div className="mt-4 p-4 rounded-xl bg-[var(--bg-elevated)] space-y-2 text-xs border border-[var(--border-subtle)]">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Station:</span>
                <span className="font-semibold text-right">{station.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Power:</span>
                <span className="font-semibold">{bestChargerKw} kW DC Fast</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Tariff Rate:</span>
                <span>₹{price.pricePerKwh}/kWh</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[var(--border-subtle)]">
                <span className="text-[var(--text-secondary)]">Estimated Total:</span>
                <span className="font-bold text-sm text-[var(--text-primary)]">₹{estimatedCostInr}</span>
              </div>
            </div>

            {reserveError && (
              <div className="mt-3 p-2 bg-[var(--bg-elevated)] border border-[var(--danger)] rounded text-xs text-[var(--danger)]">
                {reserveError}
              </div>
            )}

            {reserveSuccess && (
              <div className="mt-3 p-3 bg-[var(--bg-elevated)] border border-[var(--primary-accent)] rounded text-xs text-[var(--text-primary)] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--primary-accent)]" />
                <span>Slot reserved successfully!</span>
              </div>
            )}

            <div className="mt-6 flex items-center gap-2.5">
              <button
                disabled={reserving || reserveSuccess}
                onClick={handleConfirmReservation}
                className="flex-1 py-2.5 rounded-xl btn-primary text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                {reserving ? "Processing..." : `Pay ₹${estimatedCostInr} (Demo)`}
              </button>
              <button
                disabled={reserving}
                onClick={() => setReserveModalOpen(false)}
                className="px-4 py-2.5 rounded-xl btn-secondary text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
