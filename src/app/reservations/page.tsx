"use client";

import React, { useEffect, useState, use } from "react";
import { Navbar } from "@/components/navbar";
import { DemoControlBar } from "@/components/demo-control-bar";
import {
  CalendarCheck,
  Zap,
  Clock,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  Plus,
  ShieldCheck,
  Search,
  Filter,
  AlertTriangle,
} from "lucide-react";
import { Reservation, ChargingStation } from "@/types";

export default function ReservationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ stationId?: string }>;
}) {
  const resolvedSearchParams = searchParams ? use(searchParams) : undefined;
  const initialStationId = resolvedSearchParams?.stationId;

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stations, setStations] = useState<ChargingStation[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<string>(initialStationId || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [operatorFilter, setOperatorFilter] = useState("ALL");
  const [arrivalTimeWindow, setArrivalTimeWindow] = useState("15");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [resRes, stnRes] = await Promise.all([
        fetch("/api/reservations"),
        fetch("/api/stations"),
      ]);
      const resData = await resRes.json();
      const stnData = await stnRes.json();
      if (resData.reservations) setReservations(resData.reservations);
      if (stnData.stations) {
        setStations(stnData.stations);
        if (!selectedStationId && stnData.stations.length > 0) {
          setSelectedStationId(stnData.stations[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedStation = stations.find((s) => s.id === selectedStationId);
  // OCPI integrated networks or verified stations support remote slot locks
  const supportsReservation = selectedStation?.source === "OCPI" || selectedStation?.operator === "Zeon Electric" || selectedStation?.operator === "Shell Recharge";

  const filteredStations = stations.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.operator.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOperator =
      operatorFilter === "ALL" || s.operator.toLowerCase().includes(operatorFilter.toLowerCase());
    return matchesSearch && matchesOperator;
  });

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportsReservation) {
      setError("This station does not support remote booking locks via OCPI/API.");
      return;
    }

    setError(null);
    setMessage(null);
    setCreating(true);

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stationId: selectedStationId,
          chargerId: `chg_${selectedStationId}_01`,
          durationMinutes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Reservation failed");
        return;
      }

      setMessage(data.message || "Reservation confirmed successfully!");
      loadData();
    } catch {
      setError("Network error creating reservation");
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const res = await fetch(`/api/reservations/${id}`, { method: "DELETE" });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
      case "CONFIRMED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--primary-accent)]/15 text-[var(--primary-accent)] border border-[var(--primary-accent)]/30">
            {status}
          </span>
        );
      case "COMPLETED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--info)]/15 text-[var(--info)] border border-[var(--info)]/30">
            COMPLETED
          </span>
        );
      case "CANCELLED":
      case "EXPIRED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--danger)]/15 text-[var(--danger)] border border-[var(--danger)]/30">
            {status}
          </span>
        );
      case "NO_SHOW":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--warning)]/15 text-[var(--warning)] border border-[var(--warning)]/30">
            NO SHOW
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col pb-24">
      <Navbar />
      <DemoControlBar onScenarioChange={loadData} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <CalendarCheck className="w-7 h-7 text-[var(--primary-accent)]" />
            Charger Slot Booking & Queue Lock
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Discover verified charging stations and secure bay reservation locks with 15-minute arrival grace windows.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Reservation Booking Form */}
          <div className="card-level-2 p-6 space-y-4 rounded-2xl">
            <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
              <Plus className="w-4 h-4 text-[var(--primary-accent)]" />
              Reserve a Charging Bay
            </h3>

            {error && (
              <div className="p-3 bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-xl text-xs text-[var(--danger)] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className="p-3 bg-[var(--primary-accent)]/10 border border-[var(--primary-accent)]/30 rounded-xl text-xs text-[var(--primary-accent)] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{message}</span>
              </div>
            )}

            <form onSubmit={handleCreateReservation} className="space-y-4 text-xs">
              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-medium">Select Station</label>
                <select
                  value={selectedStationId}
                  onChange={(e) => setSelectedStationId(e.target.value)}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--primary-accent)]"
                >
                  {filteredStations.map((stn) => (
                    <option key={stn.id} value={stn.id}>
                      {stn.name} ({stn.operator})
                    </option>
                  ))}
                </select>
              </div>

              {/* Station Capability Check */}
              {!supportsReservation && selectedStation && (
                <div className="p-3 rounded-xl bg-[var(--warning)]/10 border border-[var(--warning)]/30 text-xs text-[var(--warning)] flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block">Reservation unavailable</strong>
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      {selectedStation.operator} does not expose a live reservation handshake via OCPI. Walk-in queue allocation applies.
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-medium">Expected Arrival Window</label>
                <select
                  value={arrivalTimeWindow}
                  onChange={(e) => setArrivalTimeWindow(e.target.value)}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--primary-accent)]"
                >
                  <option value="15">Arrive in 15 mins (Now)</option>
                  <option value="30">Arrive in 30 mins</option>
                  <option value="45">Arrive in 45 mins</option>
                  <option value="60">Arrive in 60 mins</option>
                </select>
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-medium">Reserved Duration</label>
                <div className="grid grid-cols-3 gap-2">
                  {[30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={`py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        durationMinutes === mins
                          ? "bg-[var(--primary-accent)] text-[#0E100F] border-[var(--primary-accent)] font-bold shadow-sm"
                          : "bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {mins} mins
                    </button>
                  ))}
                </div>
              </div>

              <div className="card-level-3 p-3.5 space-y-2 text-[11px] text-[var(--text-secondary)] rounded-xl">
                <div className="flex justify-between items-center">
                  <span>Arrival Grace Window:</span>
                  <span className="font-semibold text-[var(--text-primary)]">15 minutes</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Queue Priority Lock:</span>
                  <span className="font-semibold text-[var(--primary-accent)] flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> OCPI Guaranteed
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-[var(--border-subtle)]">
                  <span>Estimated Deposit:</span>
                  <span className="font-bold text-[var(--primary-accent)] text-xs">₹380 (Refundable Deposit)</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={creating || !supportsReservation}
                className="btn-primary w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
              >
                <Zap className="w-4 h-4" />
                {creating ? "Locking Charger Bay..." : supportsReservation ? "Lock & Reserve Bay" : "Reservation Unavailable"}
              </button>
            </form>
          </div>

          {/* Active and Past Reservations List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[var(--text-primary)]">
                Your Bookings & Queue Locks ({reservations.length})
              </h3>
              <span className="text-xs text-[var(--text-muted)]">Verified CPO locks</span>
            </div>

            {reservations.length === 0 ? (
              <div className="card-level-2 p-10 text-center text-xs text-[var(--text-secondary)] rounded-2xl">
                No active bookings found. Lock an OCPI-supported charger bay before your trip to bypass wait queues.
              </div>
            ) : (
              <div className="space-y-3">
                {reservations.map((res: any) => {
                  const isLive = res.status === "CONFIRMED" || res.status === "ACTIVE";

                  return (
                    <div
                      key={res.id}
                      className="card-level-2 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(res.status)}
                          <span className="text-xs font-mono text-[var(--text-muted)]">{res.id}</span>
                        </div>

                        <h4 className="text-sm font-bold text-[var(--text-primary)]">
                          {res.stationName || "Charging Station"}
                        </h4>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5 text-[var(--warning)]" />
                            {new Date(res.reservationStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{" "}
                            {new Date(res.reservationEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-[var(--primary-accent)] font-medium">
                            <IndianRupee className="w-3.5 h-3.5" />
                            ₹{res.estimatedCost} Deposit Paid
                          </span>
                        </div>
                      </div>

                      {isLive && (
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <button
                            onClick={() => handleCancel(res.id)}
                            className="btn-secondary px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer hover:text-[var(--danger)] hover:border-[var(--danger)]/40"
                          >
                            Release Lock
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
