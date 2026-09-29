"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { DemoControlBar } from "@/components/demo-control-bar";
import { VehicleTelemetryCard } from "@/components/vehicle-telemetry-card";
import { RecommendedStationCard } from "@/components/recommended-station-card";
import {
  Route,
  CalendarCheck,
  Leaf,
  IndianRupee,
  Clock,
  ArrowRight,
  RefreshCw,
  Zap,
  Sliders,
} from "lucide-react";
import { Vehicle, StationRecommendation, Reservation } from "@/types";
import { EvSimulationModal } from "@/components/ev-simulation-modal";

export default function DashboardPage() {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [recommendation, setRecommendation] = useState<StationRecommendation | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [_loading, setLoading] = useState(true);
  const [simulationModalOpen, setSimulationModalOpen] = useState(false);

  const loadDashboardData = async () => {
    try {
      const [vRes, rRes, resRes] = await Promise.all([
        fetch("/api/vehicle"),
        fetch("/api/recommendations"),
        fetch("/api/reservations"),
      ]);

      const vData = await vRes.json();
      const rData = await rRes.json();
      const resData = await resRes.json();

      if (vData.vehicle) setVehicle(vData.vehicle);
      if (rData.topRecommendation) setRecommendation(rData.topRecommendation);
      if (resData.reservations) setReservations(resData.reservations);
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const upcomingReservation = reservations.find(
    (r) => r.status === "CONFIRMED" || r.status === "ACTIVE"
  );

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col pb-24 transition-colors duration-200">
      <Navbar />

      <DemoControlBar
        onScenarioChange={loadDashboardData}
        currentBattery={vehicle?.currentBatteryPercentage || 45}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-7">
        {/* Page Title & Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
              Driver Operations
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
              Live vehicle telemetry and predictive charging decision engine.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSimulationModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-primary text-xs cursor-pointer shadow-xs"
            >
              <Sliders className="w-3.5 h-3.5" />
              EV Simulation
            </button>
            <button
              onClick={loadDashboardData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-secondary text-xs cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              Refresh
            </button>
          </div>
        </div>

        {/* PRIORITY 1: Vehicle State */}
        <section aria-label="Vehicle State">
          <VehicleTelemetryCard vehicle={vehicle} onRefresh={loadDashboardData} />
        </section>

        {/* PRIORITY 2: Charging Decision (Charging Intelligence) */}
        <section aria-label="Charging Decision" className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Charging Recommendation
            </span>
            <Link
              href="/map"
              className="text-xs text-[var(--primary-accent)] hover:underline flex items-center gap-1 font-semibold"
            >
              View on map <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <RecommendedStationCard
            recommendation={recommendation}
            onReserveSuccess={loadDashboardData}
          />
        </section>

        {/* PRIORITY 3 & 4: Corridor Trip & Active Reservation */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Today's Corridor Trip */}
          <div className="card-level-2 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Route className="w-3.5 h-3.5 text-[var(--info)]" />
                  Corridor Journey
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-medium border border-[var(--border-subtle)]">
                  Range Safe
                </span>
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-[var(--info)] mt-1.5 flex-shrink-0"></div>
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block">Origin (Current)</span>
                    <span className="font-semibold text-[var(--text-primary)]">T. Nagar, Central Chennai</span>
                  </div>
                </div>

                <div className="ml-1 border-l border-dashed border-[var(--border-subtle)] h-4"></div>

                <div className="flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-[var(--primary-accent)] mt-1.5 flex-shrink-0"></div>
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block">Destination</span>
                    <span className="font-semibold text-[var(--text-primary)]">Phoenix Marketcity, Velachery</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
              <span className="text-xs text-[var(--text-secondary)]">
                Corridor: <strong>8.4 km</strong>
              </span>
              <Link
                href="/plan-trip"
                className="btn-secondary px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5"
              >
                Plan Full Route
                <ArrowRight className="w-3 h-3 text-[var(--text-muted)]" />
              </Link>
            </div>
          </div>

          {/* Upcoming Reservation */}
          <div className="card-level-2 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                  <CalendarCheck className="w-3.5 h-3.5 text-[var(--primary-accent)]" />
                  Slot Reservation
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-medium border border-[var(--border-subtle)]">
                  Guaranteed
                </span>
              </div>

              {upcomingReservation ? (
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-secondary)]">Reservation Ref:</span>
                    <span className="font-mono font-bold text-[var(--text-primary)]">
                      {upcomingReservation.id}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-secondary)]">Window:</span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      Until {new Date(upcomingReservation.reservationEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-secondary)]">Deposit:</span>
                    <span className="font-bold text-[var(--text-primary)]">
                      ₹{upcomingReservation.estimatedCost}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 py-3 text-center">
                  <p className="text-xs text-[var(--text-secondary)]">No active reservations.</p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Reserve a charger at your destination to skip queue lines.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
              <Link
                href="/reservations"
                className="text-xs text-[var(--primary-accent)] hover:underline font-semibold"
              >
                View all slots
              </Link>
              <Link
                href="/reservations"
                className="btn-primary px-3.5 py-1.5 rounded-lg text-xs"
              >
                Manage Slot
              </Link>
            </div>
          </div>
        </section>

        {/* PRIORITY 5: Supporting Historical Metrics (Level 3 - Calm, Non-competing) */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card-level-3 p-3.5 rounded-xl">
            <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
              <Zap className="w-3 h-3 text-[var(--primary-accent)]" />
              Total Energy
            </span>
            <span className="text-lg font-bold text-[var(--text-primary)] mt-1 block">
              184.6 <span className="text-xs font-normal text-[var(--text-muted)]">kWh</span>
            </span>
          </div>

          <div className="card-level-3 p-3.5 rounded-xl">
            <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
              <IndianRupee className="w-3 h-3 text-[var(--text-secondary)]" />
              Total Spent
            </span>
            <span className="text-lg font-bold text-[var(--text-primary)] mt-1 block">
              ₹3,415
            </span>
          </div>

          <div className="card-level-3 p-3.5 rounded-xl">
            <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
              <Clock className="w-3 h-3 text-[var(--warning)]" />
              Avg. Duration
            </span>
            <span className="text-lg font-bold text-[var(--text-primary)] mt-1 block">
              26 <span className="text-xs font-normal text-[var(--text-muted)]">mins</span>
            </span>
          </div>

          <div className="card-level-3 p-3.5 rounded-xl">
            <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
              <Leaf className="w-3 h-3 text-[var(--primary-accent)]" />
              CO₂ Avoided
            </span>
            <span className="text-lg font-bold text-[var(--text-primary)] mt-1 block">
              142.8 <span className="text-xs font-normal text-[var(--text-muted)]">kg</span>
            </span>
          </div>
        </section>
      </main>

      <EvSimulationModal
        isOpen={simulationModalOpen}
        onClose={() => setSimulationModalOpen(false)}
        onApplied={loadDashboardData}
        initialBattery={vehicle?.currentBatteryPercentage || 45}
      />
    </div>
  );
}
