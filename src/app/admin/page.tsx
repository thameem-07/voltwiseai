"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  Activity,
  Layers,
  AlertTriangle,
  RefreshCw,
  Sliders,
  BarChart3,
  MapPin,
  CheckCircle2,
  Clock,
  IndianRupee,
  Flame,
  ArrowUpRight,
  Database,
  Radio,
  Lock,
  ArrowLeft,
  Users,
  Server,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { ChargingStation, FaultReport, StationSyncLog, User } from "@/types";

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "STATIONS" | "SYNC" | "FAULTS" | "SIMULATION">("OVERVIEW");
  const [metrics, setMetrics] = useState<any>(null);
  const [stations, setStations] = useState<ChargingStation[]>([]);
  const [syncLogs, setSyncLogs] = useState<StationSyncLog[]>([]);
  const [faults, setFaults] = useState<FaultReport[]>([]);
  const [syncingSource, setSyncingSource] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verify Admin Role Server Authorization
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data.user || data.user.role !== "ADMIN") {
          setAuthorized(false);
          setLoading(false);
        } else {
          setCurrentUser(data.user);
          setAuthorized(true);
          loadAdminData();
        }
      })
      .catch(() => {
        setAuthorized(false);
        setLoading(false);
      });
  }, []);

  const loadAdminData = async () => {
    try {
      const [mRes, sRes, syncRes, fRes] = await Promise.all([
        fetch("/api/admin/metrics"),
        fetch("/api/stations"),
        fetch("/api/sync"),
        fetch("/api/faults"),
      ]);

      const mData = await mRes.json();
      const sData = await sRes.json();
      const syncData = await syncRes.json();
      const fData = await fRes.json();

      if (mData.summary) setMetrics(mData);
      if (sData.stations) setStations(sData.stations);
      if (syncData.logs) setSyncLogs(syncData.logs);
      if (fData.faults) setFaults(fData.faults);
    } catch (err) {
      console.error("Admin load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerSync = async (source: string) => {
    try {
      setSyncingSource(source);
      setSyncMessage(null);
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
      const data = await res.json();
      setSyncMessage(data.message || "Sync completed successfully");
      loadAdminData();
    } catch {
      setSyncMessage("Sync failed");
    } finally {
      setSyncingSource(null);
    }
  };

  const handleResolveFault = async (faultId: string) => {
    try {
      await fetch(`/api/faults/${faultId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "RESOLVED" }),
      });
      loadAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  // 403 Forbidden State for unauthorized drivers
  if (authorized === false) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center p-4">
        <div className="card-level-2 max-w-md w-full p-8 rounded-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--danger)]/15 border border-[var(--danger)]/30 text-[var(--danger)] flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            403 — Unauthorized Access
          </h1>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            The VoltWise Operations Console is restricted to authenticated CPO and grid infrastructure administrators. Your driver account is not authorized to view this resource.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Driver Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const summary = metrics?.summary || {
    totalDrivers: 24,
    totalVehicles: 38,
    totalStations: 8,
    totalChargers: 22,
    activeChargers: 18,
    occupiedChargers: 8,
    averageQueueLength: 3,
    averageWaitMinutes: 14,
    todaySessionsCount: 42,
    todayRevenueInr: 12480,
    pendingFaultReports: 1,
  };

  const hourlyTrend = metrics?.hourlyTrend || [
    { time: "06:00", sessions: 4, utilization: 22 },
    { time: "08:00", sessions: 14, utilization: 68 },
    { time: "10:00", sessions: 18, utilization: 76 },
    { time: "12:00", sessions: 11, utilization: 50 },
    { time: "14:00", sessions: 9, utilization: 42 },
    { time: "16:00", sessions: 15, utilization: 62 },
    { time: "18:00", sessions: 24, utilization: 92 },
    { time: "20:00", sessions: 21, utilization: 84 },
    { time: "22:00", sessions: 8, utilization: 38 },
  ];

  const infrastructureGaps = metrics?.infrastructureGaps || [];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col pb-24">
      {/* Dedicated Admin Operations Header (Not Driver Navbar) */}
      <header className="sticky top-0 z-40 w-full bg-[var(--bg-surface)]/95 backdrop-blur-md border-b border-[var(--border-subtle)] px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--primary-accent)]/15 border border-[var(--primary-accent)]/30 flex items-center justify-center text-[var(--primary-accent)]">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[var(--text-primary)]">
                  VoltWise<span className="text-[var(--primary-accent)]">.AI</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--primary-accent)] text-[#0E100F]">
                  ADMIN OPERATIONS CONSOLE
                </span>
              </div>
              <span className="text-[10px] text-[var(--text-muted)]">
                CPO & Grid Infrastructure Management System
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-[var(--text-secondary)] hidden sm:inline">
              Logged in as <strong className="text-[var(--text-primary)]">{currentUser?.email}</strong>
            </span>
            <Link
              href="/dashboard"
              className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:border-[var(--primary-accent)]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Exit to Driver App
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] pb-2 text-xs font-semibold">
          {[
            { id: "OVERVIEW", label: "Overview & Demand Analytics", icon: BarChart3 },
            { id: "STATIONS", label: `Live Stations (${stations.length})`, icon: MapPin },
            { id: "SYNC", label: "Data Sync Center", icon: Layers },
            { id: "FAULTS", label: `Fault Reports (${faults.length})`, icon: AlertTriangle },
            { id: "SIMULATION", label: "Simulation Scenarios", icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? "bg-[var(--primary-accent)] text-[#0E100F] font-bold shadow-sm"
                    : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW & DEMAND ANALYTICS */}
        {activeTab === "OVERVIEW" && (
          <div className="space-y-6">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="card-level-3 p-3.5 rounded-xl">
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-medium">Total Fleet EVs</span>
                <span className="text-xl font-bold text-[var(--text-primary)] mt-0.5 block">{summary.totalVehicles}</span>
              </div>
              <div className="card-level-3 p-3.5 rounded-xl">
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-medium">Monitored Hubs</span>
                <span className="text-xl font-bold text-[var(--text-primary)] mt-0.5 block">{summary.totalStations}</span>
              </div>
              <div className="card-level-3 p-3.5 rounded-xl">
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-medium">Active EVSEs</span>
                <span className="text-xl font-bold text-[var(--primary-accent)] mt-0.5 block">{summary.activeChargers}</span>
              </div>
              <div className="card-level-3 p-3.5 rounded-xl">
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-medium">Avg City Wait</span>
                <span className="text-xl font-bold text-[var(--warning)] mt-0.5 block">{summary.averageWaitMinutes}m</span>
              </div>
              <div className="card-level-3 p-3.5 rounded-xl">
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-medium">Today Sessions</span>
                <span className="text-xl font-bold text-[var(--info)] mt-0.5 block">{summary.todaySessionsCount}</span>
              </div>
              <div className="card-level-3 p-3.5 rounded-xl">
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-medium">Today Revenue</span>
                <span className="text-xl font-bold text-[var(--primary-accent)] mt-0.5 block">₹{summary.todayRevenueInr}</span>
              </div>
            </div>

            {/* Demand Prediction Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card-level-2 p-5 space-y-4 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">
                      24-Hour Network Utilization (% Capacity)
                    </h3>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Historical load profile blended with predictive evening rush peak
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-[var(--primary-accent)] bg-[var(--primary-accent)]/15 border border-[var(--primary-accent)]/30 px-2 py-0.5 rounded">
                    Peak at 18:00 (92%)
                  </span>
                </div>

                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={hourlyTrend}>
                      <defs>
                        <linearGradient id="utilGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary-accent)" stopOpacity={0.4} />
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
                      <Area type="monotone" dataKey="utilization" stroke="var(--primary-accent)" strokeWidth={2} fillOpacity={1} fill="url(#utilGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card-level-2 p-5 space-y-4 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">
                      Active Charging Sessions Distribution
                    </h3>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Concurrent EV connections across city sectors
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-[var(--info)] bg-[var(--info)]/15 border border-[var(--info)]/30 px-2 py-0.5 rounded">
                    Active Load Flow
                  </span>
                </div>

                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyTrend}>
                      <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={11} />
                      <YAxis stroke="var(--text-muted)" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--bg-elevated)",
                          borderColor: "var(--border-subtle)",
                          color: "var(--text-primary)",
                          fontSize: "11px",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="sessions" fill="var(--info)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Infrastructure Gap Diagnostics */}
            <div className="card-level-2 p-6 space-y-4 rounded-2xl">
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[var(--danger)]" />
                  Infrastructure Gap & Bottleneck Diagnostics
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Regions where EV traffic growth severely outpaces fast-charging power density.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {infrastructureGaps.map((gap: any, idx: number) => {
                  const isCrit = gap.currentBottleneckLevel === "CRITICAL";

                  return (
                    <div
                      key={idx}
                      className={`card-level-3 p-4 space-y-2 rounded-xl ${
                        isCrit ? "border-[var(--danger)]/50" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-[var(--text-primary)]">{gap.regionName}</h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isCrit
                              ? "bg-[var(--danger)]/15 text-[var(--danger)] border border-[var(--danger)]/30"
                              : "bg-[var(--warning)]/15 text-[var(--warning)] border border-[var(--warning)]/30"
                          }`}
                        >
                          {gap.currentBottleneckLevel} BOTTLENECK
                        </span>
                      </div>

                      <p className="text-xs text-[var(--text-secondary)]">{gap.recommendation}</p>

                      <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                        <span>Installed Power: <strong className="text-[var(--text-primary)]">{gap.fastChargerDensityKw} kW</strong></span>
                        <span>Unmet Demand: <strong className="text-[var(--danger)]">~{gap.estimatedUnmetDemandKwh} kWh/day</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE STATIONS DIRECTORY */}
        {activeTab === "STATIONS" && (
          <div className="card-level-2 p-6 space-y-4 rounded-2xl">
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">
                Verified Charging Stations Directory
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Normalized database records aggregated from OpenChargeMap, BEE India, and OCPI 2.3.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-subtle)] text-[10px]">
                  <tr>
                    <th className="pb-3 font-semibold">Station Name</th>
                    <th className="pb-3 font-semibold">Operator</th>
                    <th className="pb-3 font-semibold">Protocol Source</th>
                    <th className="pb-3 font-semibold">Coordinates</th>
                    <th className="pb-3 font-semibold">Verification</th>
                    <th className="pb-3 font-semibold">Last Synced</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-secondary)]">
                  {stations.map((stn) => (
                    <tr key={stn.id} className="hover:bg-[var(--bg-elevated)]/60 transition-colors">
                      <td className="py-3 font-semibold text-[var(--text-primary)]">{stn.name}</td>
                      <td className="py-3">{stn.operator}</td>
                      <td className="py-3 font-mono text-[10px] text-[var(--info)]">{stn.source}</td>
                      <td className="py-3 font-mono text-[11px]">{stn.latitude.toFixed(4)}, {stn.longitude.toFixed(4)}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--primary-accent)]/15 text-[var(--primary-accent)] border border-[var(--primary-accent)]/30">
                          {stn.verificationStatus}
                        </span>
                      </td>
                      <td className="py-3 text-[11px] text-[var(--text-muted)]">
                        {new Date(stn.localLastUpdated).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: DATA SYNC DASHBOARD (Section 31) */}
        {activeTab === "SYNC" && (
          <div className="space-y-6">
            <div className="card-level-2 p-6 space-y-4 rounded-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">
                    External Infrastructure Synchronization Dashboard
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Sync station locations, tariffs, and EVSE status from external national grids.
                  </p>
                </div>

                <button
                  disabled={syncingSource !== null}
                  onClick={() => handleTriggerSync("ALL")}
                  className="btn-primary px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingSource ? "animate-spin" : ""}`} />
                  {syncingSource ? "Syncing Grid..." : "Sync All Sources Now"}
                </button>
              </div>

              {syncMessage && (
                <div className="p-3 bg-[var(--primary-accent)]/10 border border-[var(--primary-accent)]/30 rounded-xl text-xs text-[var(--primary-accent)]">
                  {syncMessage}
                </div>
              )}

              {/* Source Cards with detailed sync statistics (Section 31) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div className="card-level-3 p-4 space-y-2.5 rounded-xl">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs text-[var(--text-primary)]">OPEN CHARGE MAP</strong>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--primary-accent)]/15 text-[var(--primary-accent)]">
                      ONLINE
                    </span>
                  </div>
                  <div className="text-[11px] space-y-1 text-[var(--text-secondary)]">
                    <div className="flex justify-between"><span>Last sync:</span> <strong className="text-[var(--text-primary)]">2 min ago</strong></div>
                    <div className="flex justify-between"><span>Stations:</span> <strong className="text-[var(--text-primary)]">1,284</strong></div>
                    <div className="flex justify-between"><span>Updated:</span> <strong className="text-[var(--info)]">47</strong></div>
                    <div className="flex justify-between"><span>New:</span> <strong className="text-[var(--primary-accent)]">12</strong></div>
                    <div className="flex justify-between"><span>Errors:</span> <strong className="text-[var(--text-muted)]">0</strong></div>
                  </div>
                  <button
                    onClick={() => handleTriggerSync("OPEN_CHARGE_MAP")}
                    className="btn-secondary w-full mt-2 py-1.5 rounded-lg text-xs"
                  >
                    Sync OCM Feed
                  </button>
                </div>

                <div className="card-level-3 p-4 space-y-2.5 rounded-xl">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs text-[var(--text-primary)]">BEE NATIONAL PORTAL</strong>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--primary-accent)]/15 text-[var(--primary-accent)]">
                      INTEGRATED
                    </span>
                  </div>
                  <div className="text-[11px] space-y-1 text-[var(--text-secondary)]">
                    <div className="flex justify-between"><span>Last sync:</span> <strong className="text-[var(--text-primary)]">8 min ago</strong></div>
                    <div className="flex justify-between"><span>Stations:</span> <strong className="text-[var(--text-primary)]">840</strong></div>
                    <div className="flex justify-between"><span>Updated:</span> <strong className="text-[var(--info)]">22</strong></div>
                    <div className="flex justify-between"><span>New:</span> <strong className="text-[var(--primary-accent)]">5</strong></div>
                    <div className="flex justify-between"><span>Errors:</span> <strong className="text-[var(--text-muted)]">0</strong></div>
                  </div>
                  <button
                    onClick={() => handleTriggerSync("BEE")}
                    className="btn-secondary w-full mt-2 py-1.5 rounded-lg text-xs"
                  >
                    Sync BEE Dataset
                  </button>
                </div>

                <div className="card-level-3 p-4 space-y-2.5 rounded-xl">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs text-[var(--text-primary)]">OCPI 2.3 OPERATORS</strong>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--info)]/15 text-[var(--info)]">
                      EMULATED
                    </span>
                  </div>
                  <div className="text-[11px] space-y-1 text-[var(--text-secondary)]">
                    <div className="flex justify-between"><span>Last sync:</span> <strong className="text-[var(--text-primary)]">35 sec ago</strong></div>
                    <div className="flex justify-between"><span>Active EVSEs:</span> <strong className="text-[var(--text-primary)]">22</strong></div>
                    <div className="flex justify-between"><span>Tariff Handshakes:</span> <strong className="text-[var(--info)]">Verified</strong></div>
                    <div className="flex justify-between"><span>Live Queues:</span> <strong className="text-[var(--primary-accent)]">Active</strong></div>
                    <div className="flex justify-between"><span>Errors:</span> <strong className="text-[var(--text-muted)]">0</strong></div>
                  </div>
                  <button
                    onClick={() => handleTriggerSync("OCPI")}
                    className="btn-secondary w-full mt-2 py-1.5 rounded-lg text-xs"
                  >
                    Sync OCPI Network
                  </button>
                </div>
              </div>
            </div>

            {/* Sync Audit History */}
            <div className="card-level-2 p-6 space-y-3 rounded-2xl">
              <h4 className="font-bold text-sm text-[var(--text-primary)]">Recent Synchronization Audit Logs</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-subtle)] text-[10px]">
                    <tr>
                      <th className="pb-2 font-semibold">Protocol</th>
                      <th className="pb-2 font-semibold">Completed At</th>
                      <th className="pb-2 font-semibold">Received</th>
                      <th className="pb-2 font-semibold">Created</th>
                      <th className="pb-2 font-semibold">Updated</th>
                      <th className="pb-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-secondary)]">
                    {syncLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="py-2.5 font-bold text-[var(--text-primary)]">{log.source}</td>
                        <td className="py-2.5">{new Date(log.completedAt).toLocaleTimeString()}</td>
                        <td className="py-2.5">{log.recordsReceived}</td>
                        <td className="py-2.5 text-[var(--primary-accent)] font-semibold">+{log.recordsCreated}</td>
                        <td className="py-2.5 text-[var(--info)] font-semibold">{log.recordsUpdated}</td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--primary-accent)]/15 text-[var(--primary-accent)] border border-[var(--primary-accent)]/30">
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: FAULT REPORTS */}
        {activeTab === "FAULTS" && (
          <div className="card-level-2 p-6 space-y-4 rounded-2xl">
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">
                Charger Malfunction & Incident Queue
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Review driver crowdsourced hardware reports and dispatch field technician teams.
              </p>
            </div>

            <div className="space-y-3">
              {faults.map((flt: any) => {
                const isPending = flt.status === "PENDING" || flt.status === "INVESTIGATING";

                return (
                  <div
                    key={flt.id}
                    className="card-level-3 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--danger)]/15 text-[var(--danger)] border border-[var(--danger)]/30">
                          {flt.severity}
                        </span>
                        <span className="text-xs font-bold text-[var(--text-primary)]">{flt.stationName || "Charging Station"}</span>
                        <span className="text-[11px] text-[var(--text-muted)]">• {flt.category}</span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-1.5">{flt.description}</p>
                      <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                        Logged on {new Date(flt.createdAt).toLocaleDateString()} at {new Date(flt.createdAt).toLocaleTimeString()}
                      </span>
                    </div>

                    {isPending ? (
                      <button
                        onClick={() => handleResolveFault(flt.id)}
                        className="btn-primary px-3.5 py-1.5 rounded-xl font-bold text-xs flex-shrink-0 cursor-pointer"
                      >
                        Mark Resolved
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-[var(--primary-accent)] flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Resolved
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: SIMULATION SCENARIOS */}
        {activeTab === "SIMULATION" && (
          <div className="card-level-2 p-6 space-y-6 rounded-2xl">
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">
                Grid Demand & City Scenario Simulator
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Simulate city-wide traffic bottlenecks and evaluate recommendation engine dynamic rerouting.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="card-level-3 p-4 space-y-2 rounded-xl">
                <span className="text-xs font-bold text-[var(--danger)] block">⚡ Evening Rush Surge</span>
                <p className="text-xs text-[var(--text-secondary)]">
                  Forces 85% occupancy and 30-min queues across central Chennai hubs.
                </p>
                <button
                  onClick={() => {
                    fetch("/api/demo/scenario", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ scenarioId: "scenario-3" }),
                    }).then(() => loadAdminData());
                  }}
                  className="w-full mt-2 py-2 rounded-xl bg-[var(--danger)]/15 hover:bg-[var(--danger)]/25 text-[var(--danger)] border border-[var(--danger)]/30 font-bold text-xs cursor-pointer transition-colors"
                >
                  Trigger Rush Hour
                </button>
              </div>

              <div className="card-level-3 p-4 space-y-2 rounded-xl">
                <span className="text-xs font-bold text-[var(--warning)] block">📍 Nearest Station Congestion</span>
                <p className="text-xs text-[var(--text-secondary)]">
                  Simulates high queue volume at local hub to evaluate dynamic multi-factor rerouting.
                </p>
                <button
                  onClick={() => {
                    fetch("/api/demo/scenario", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ scenarioId: "scenario-2" }),
                    }).then(() => loadAdminData());
                  }}
                  className="w-full mt-2 py-2 rounded-xl bg-[var(--warning)]/15 hover:bg-[var(--warning)]/25 text-[var(--warning)] border border-[var(--warning)]/30 font-bold text-xs cursor-pointer transition-colors"
                >
                  Trigger Bottleneck
                </button>
              </div>

              <div className="card-level-3 p-4 space-y-2 rounded-xl">
                <span className="text-xs font-bold text-[var(--primary-accent)] block">🔄 Reset to Baseline</span>
                <p className="text-xs text-[var(--text-secondary)]">
                  Restores nominal conditions and clears simulated test queues.
                </p>
                <button
                  onClick={() => {
                    fetch("/api/demo/reset", { method: "POST" }).then(() => loadAdminData());
                  }}
                  className="w-full mt-2 py-2 rounded-xl bg-[var(--primary-accent)]/15 hover:bg-[var(--primary-accent)]/25 text-[var(--primary-accent)] border border-[var(--primary-accent)]/30 font-bold text-xs cursor-pointer transition-colors"
                >
                  Reset Network
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
