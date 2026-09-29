"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/navbar";
import { DemoControlBar } from "@/components/demo-control-bar";
import {
  History,
  Zap,
  Leaf,
  IndianRupee,
  Clock,
  Battery,
  ArrowRight,
} from "lucide-react";
import { ChargingSession } from "@/types";

export default function HistoryPage() {
  const [sessions] = useState<ChargingSession[]>([
    {
      id: "sess_01",
      userId: "usr_driver_01",
      vehicleId: "veh_nexon_01",
      stationId: "stn_zeon_ea",
      chargerId: "chg_ea_01",
      startTime: new Date(Date.now() - 86400000).toISOString(),
      endTime: new Date(Date.now() - 84000000).toISOString(),
      startingBattery: 18,
      endingBattery: 85,
      energyConsumedKwh: 27.2,
      chargingPowerKw: 120,
      estimatedCost: 523,
      actualCost: 523,
      status: "COMPLETED",
    },
    {
      id: "sess_02",
      userId: "usr_driver_01",
      vehicleId: "veh_nexon_01",
      stationId: "stn_jiobp_velachery",
      chargerId: "chg_jio_01",
      startTime: new Date(Date.now() - 259200000).toISOString(),
      endTime: new Date(Date.now() - 257400000).toISOString(),
      startingBattery: 22,
      endingBattery: 80,
      energyConsumedKwh: 23.5,
      chargingPowerKw: 150,
      estimatedCost: 421,
      actualCost: 421,
      status: "COMPLETED",
    },
    {
      id: "sess_03",
      userId: "usr_driver_01",
      vehicleId: "veh_nexon_01",
      stationId: "stn_tata_guindy",
      chargerId: "chg_guindy_01",
      startTime: new Date(Date.now() - 604800000).toISOString(),
      endTime: new Date(Date.now() - 602400000).toISOString(),
      startingBattery: 12,
      endingBattery: 78,
      energyConsumedKwh: 26.7,
      chargingPowerKw: 60,
      estimatedCost: 522,
      actualCost: 522,
      status: "COMPLETED",
    },
  ]);

  const totalKwh = sessions.reduce((acc, s) => acc + s.energyConsumedKwh, 0);
  const totalCost = sessions.reduce((acc, s) => acc + (s.actualCost || s.estimatedCost), 0);
  const co2AvoidedKg = (totalKwh * 0.82).toFixed(1);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col pb-24 transition-colors duration-200">
      <Navbar />
      <DemoControlBar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <History className="w-7 h-7 text-[var(--primary-accent)]" />
            Charging Session History
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Historical charge cycle telemetry, throughput, expenditure, and carbon offset logs.
          </p>
        </div>

        {/* Environmental & Financial Metrics Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card-level-3 p-4">
            <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5 font-medium">
              <Zap className="w-3.5 h-3.5 text-[var(--primary-accent)]" />
              Energy Delivered
            </span>
            <span className="text-xl font-bold text-[var(--text-primary)] mt-1 block">
              {totalKwh.toFixed(1)} <span className="text-xs font-normal text-[var(--text-secondary)]">kWh</span>
            </span>
          </div>

          <div className="card-level-3 p-4">
            <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5 font-medium">
              <IndianRupee className="w-3.5 h-3.5 text-[var(--info)]" />
              Total Spent
            </span>
            <span className="text-xl font-bold text-[var(--text-primary)] mt-1 block">
              ₹{totalCost}
            </span>
          </div>

          <div className="card-level-3 p-4">
            <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-[var(--warning)]" />
              Total Sessions
            </span>
            <span className="text-xl font-bold text-[var(--text-primary)] mt-1 block">
              {sessions.length}
            </span>
          </div>

          <div className="card-level-3 p-4">
            <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5 font-medium">
              <Leaf className="w-3.5 h-3.5 text-[var(--primary-accent)]" />
              CO₂ Avoided
            </span>
            <span className="text-xl font-bold text-[var(--primary-accent)] mt-1 block">
              {co2AvoidedKg} <span className="text-xs font-normal text-[var(--text-secondary)]">kg</span>
            </span>
          </div>
        </div>

        {/* Sessions Table */}
        <div className="card-level-2 p-6 space-y-4">
          <h3 className="font-bold text-sm text-[var(--text-primary)]">
            Verified Charging Sessions
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-subtle)] text-[10px]">
                <tr>
                  <th className="pb-3 font-semibold">Session ID</th>
                  <th className="pb-3 font-semibold">Station</th>
                  <th className="pb-3 font-semibold">Battery Before → After</th>
                  <th className="pb-3 font-semibold">Energy</th>
                  <th className="pb-3 font-semibold">Power</th>
                  <th className="pb-3 font-semibold">Cost</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-secondary)]">
                {sessions.map((sess) => (
                  <tr key={sess.id} className="hover:bg-[var(--bg-elevated)]/60 transition-colors">
                    <td className="py-3.5 font-mono text-[var(--text-primary)]">{sess.id}</td>
                    <td className="py-3.5 font-semibold text-[var(--text-primary)]">
                      {sess.stationId.replace("stn_", "").toUpperCase()} Hub
                    </td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-[var(--warning)] font-semibold">{sess.startingBattery}%</span>
                        <ArrowRight className="w-3 h-3 text-[var(--text-muted)]" />
                        <span className="text-[var(--primary-accent)] font-semibold">{sess.endingBattery}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 font-bold text-[var(--text-primary)]">{sess.energyConsumedKwh} kWh</td>
                    <td className="py-3.5 text-[var(--info)]">{sess.chargingPowerKw} kW DC</td>
                    <td className="py-3.5 font-bold text-[var(--primary-accent)]">₹{sess.actualCost}</td>
                    <td className="py-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--primary-accent)]/15 text-[var(--primary-accent)] border border-[var(--primary-accent)]/30">
                        {sess.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
