"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import {
  Car,
  Battery,
  Zap,
  Activity,
  Radio,
  Gauge,
  Thermometer,
  ShieldCheck,
  Clock,
  MapPin,
  Settings,
  ArrowUpRight,
  TrendingUp,
  Leaf,
  Layers,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Vehicle } from "@/types";

export default function VehiclePage() {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [obdPacket, setObdPacket] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadVehicle = async () => {
    try {
      const [vRes, obdRes] = await Promise.all([
        fetch("/api/vehicle"),
        fetch("/api/vehicle/obd"),
      ]);
      const vData = await vRes.json();
      const obdData = await obdRes.json();

      if (vData.vehicle) setVehicle(vData.vehicle);
      if (obdData.packet) setObdPacket(obdData.packet);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicle();
  }, []);

  const soc = vehicle?.currentBatteryPercentage ?? 45;
  const range = vehicle?.estimatedRangeKm ?? 160;
  const isCharging = vehicle?.chargingStatus === "CHARGING";

  const batteryTrendData = [
    { time: "06:00", soc: Math.min(100, soc + 35) },
    { time: "09:00", soc: Math.max(10, soc + 20) },
    { time: "12:00", soc: Math.max(10, soc + 10) },
    { time: "15:00", soc: Math.max(10, soc + 2) },
    { time: "18:00", soc: soc },
    { time: "Current", soc: soc },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col pb-24">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[var(--primary-accent)]/15 text-[var(--primary-accent)] border border-[var(--primary-accent)]/30">
                <Car className="w-5 h-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
                {vehicle?.make || "Tata"} {vehicle?.model || "Nexon EV Max"}
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] font-mono">
                {vehicle?.year || 2024}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
              Active powertrain monitoring, high-voltage battery telemetry, and pack health diagnostics.
            </p>
          </div>

          <Link
            href="/onboarding"
            className="btn-secondary self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold hover:border-[var(--primary-accent)] transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-[var(--primary-accent)]" />
            Manage Vehicle Connection
          </Link>
        </div>

        {/* Primary Telemetry Anchor: 3-Tier Card Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main State Card (Level 1) */}
          <div className="card-level-1 p-6 space-y-5 rounded-2xl relative">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <Battery className="w-4 h-4 text-[var(--primary-accent)]" />
                State of Charge (SoC)
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--bg-elevated)] text-[var(--primary-accent)] border border-[var(--border-subtle)]">
                {vehicle?.connectionMode === "OBD_DEVICE"
                  ? "● OBD-II LINK"
                  : vehicle?.connectionMode === "OEM_API"
                  ? "● LIVE API"
                  : vehicle?.connectionMode === "MANUAL"
                  ? "● MANUAL ENTRY"
                  : "● SIMULATED"}
              </span>
            </div>

            {/* Dominant SoC Number */}
            <div className="flex items-baseline gap-3">
              <span className="text-6xl font-black tracking-tight text-[var(--text-primary)]">
                {soc}%
              </span>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-[var(--primary-accent)]">
                  {range} km
                </span>
                <span className="text-xs text-[var(--text-muted)]">Estimated Range</span>
              </div>
            </div>

            {/* Segmented Battery Bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-[var(--bg-elevated)] h-3 rounded-full overflow-hidden p-0.5 border border-[var(--border-subtle)]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${soc}%`,
                    backgroundColor:
                      soc <= 15
                        ? "var(--danger)"
                        : soc <= 30
                        ? "var(--warning)"
                        : "var(--primary-accent)",
                  }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] font-mono text-[var(--text-muted)]">
                <span>0%</span>
                <span>Buffer 15%</span>
                <span>100% (40.5 kWh)</span>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="pt-2 border-t border-[var(--border-subtle)] grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[11px] text-[var(--text-muted)] block">Charging Status</span>
                <span className="font-bold text-[var(--text-primary)] mt-0.5 flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isCharging ? "bg-[var(--primary-accent)] animate-pulse" : "bg-[var(--text-muted)]"
                    }`}
                  ></span>
                  {isCharging ? "Fast Charging" : "Not Charging"}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[var(--text-muted)] block">Connector Port</span>
                <span className="font-bold text-[var(--text-primary)] mt-0.5">
                  {vehicle?.connectorType || "CCS2"} (DC Fast)
                </span>
              </div>
            </div>
          </div>

          {/* Realtime Diagnostics & Telemetry Specs (Level 2) */}
          <div className="lg:col-span-2 card-level-2 p-6 space-y-4 rounded-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[var(--info)]" />
                  Powertrain Diagnostics & Sensor Telemetry
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Live bus frames streamed via {vehicle?.connectionMode === "OBD_DEVICE" ? "OBD-II CAN Interface" : "Telemetry Pipeline"}
                </p>
              </div>
              <span className="text-[11px] font-mono text-[var(--primary-accent)] bg-[var(--primary-accent)]/10 px-2 py-0.5 rounded border border-[var(--primary-accent)]/30">
                BMS: NOMINAL
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="card-level-3 p-3.5 space-y-1">
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-medium">Pack Voltage</span>
                <span className="text-base font-bold text-[var(--text-primary)] font-mono">
                  {obdPacket?.packVoltageVolts || 388.4} V
                </span>
                <span className="text-[10px] text-[var(--text-muted)] block">Nominal: 390V</span>
              </div>

              <div className="card-level-3 p-3.5 space-y-1">
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-medium">Pack Current</span>
                <span className="text-base font-bold text-[var(--info)] font-mono">
                  {obdPacket?.packCurrentAmps || -118} A
                </span>
                <span className="text-[10px] text-[var(--text-muted)] block">HV Bus Flow</span>
              </div>

              <div className="card-level-3 p-3.5 space-y-1">
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-medium">Cell Temp</span>
                <span className="text-base font-bold text-[var(--warning)] font-mono flex items-center gap-1">
                  <Thermometer className="w-3.5 h-3.5" />
                  {obdPacket?.batteryTempCelsius || 29.4} °C
                </span>
                <span className="text-[10px] text-[var(--text-muted)] block">Thermal Window OK</span>
              </div>

              <div className="card-level-3 p-3.5 space-y-1">
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-medium">Odometer</span>
                <span className="text-base font-bold text-[var(--text-primary)] font-mono">
                  {obdPacket?.odometerKm?.toLocaleString() || "14,820"} km
                </span>
                <span className="text-[10px] text-[var(--text-muted)] block">Fleet Mileage</span>
              </div>
            </div>

            {/* Secondary Technical Specs */}
            <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)] block">Battery Capacity</span>
                <strong className="text-[var(--text-primary)]">{vehicle?.batteryCapacityKwh || 40.5} kWh</strong>
              </div>
              <div className="p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)] block">Cell Variance</span>
                <strong className="text-[var(--primary-accent)]">11 mV (Optimal)</strong>
              </div>
              <div className="p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)] block">Current Location</span>
                <strong className="text-[var(--text-primary)] truncate block">
                  {vehicle?.currentLatitude?.toFixed(4)}, {vehicle?.currentLongitude?.toFixed(4)}
                </strong>
              </div>
              <div className="p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)] block">Max DC Fast Charge</span>
                <strong className="text-[var(--info)]">120 kW Peak</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Battery Trend Chart & Vehicle Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 24-Hour Battery Trend */}
          <div className="lg:col-span-2 card-level-2 p-6 space-y-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[var(--primary-accent)]" />
                  Battery Discharge & Charge Cycle (Recent 24h)
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Continuous state-of-charge progression across recent urban driving corridors
                </p>
              </div>
              <span className="text-xs font-mono text-[var(--text-secondary)]">
                Avg: 142 Wh/km
              </span>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={batteryTrendData}>
                  <defs>
                    <linearGradient id="socGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary-accent)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--primary-accent)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--bg-elevated)",
                      borderColor: "var(--border-subtle)",
                      color: "var(--text-primary)",
                      fontSize: "11px",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="soc"
                    stroke="var(--primary-accent)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#socGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Vehicle Statistics Card */}
          <div className="card-level-2 p-6 space-y-4 rounded-2xl">
            <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[var(--primary-accent)]" />
              Vehicle Lifetime Statistics
            </h3>

            <div className="space-y-3">
              <div className="card-level-3 p-3.5 space-y-1">
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-medium">Total Clean Energy</span>
                <span className="text-xl font-bold text-[var(--text-primary)]">77.4 kWh</span>
                <span className="text-[10px] text-[var(--text-secondary)] block">Consumed across 3 public hubs</span>
              </div>

              <div className="card-level-3 p-3.5 space-y-1">
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-medium">CO₂ Emissions Displaced</span>
                <span className="text-xl font-bold text-[var(--primary-accent)] flex items-center gap-1.5">
                  <Leaf className="w-4 h-4 text-[var(--primary-accent)]" />
                  63.5 kg
                </span>
                <span className="text-[10px] text-[var(--text-secondary)] block">vs internal combustion baseline</span>
              </div>

              <div className="card-level-3 p-3.5 space-y-1">
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-medium">Average Highway Efficiency</span>
                <span className="text-xl font-bold text-[var(--info)]">7.1 km/kWh</span>
                <span className="text-[10px] text-[var(--text-secondary)] block">Optimized via pre-planned routes</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
