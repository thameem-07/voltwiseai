"use client";

import React, { useEffect, useState, use } from "react";
import { Navbar } from "@/components/navbar";
import { DemoControlBar } from "@/components/demo-control-bar";
import {
  AlertTriangle,
  Send,
  CheckCircle2,
} from "lucide-react";
import { ChargingStation } from "@/types";

export default function ReportFaultPage({
  searchParams,
}: {
  searchParams?: Promise<{ stationId?: string }>;
}) {
  const resolvedSearchParams = searchParams ? use(searchParams) : undefined;
  const initialStationId = resolvedSearchParams?.stationId;

  const [stations, setStations] = useState<ChargingStation[]>([]);
  const [stationId, setStationId] = useState(initialStationId || "");
  const [category, setCategory] = useState("CONNECTOR_DAMAGED");
  const [severity, setSeverity] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("HIGH");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stations")
      .then((res) => res.json())
      .then((data) => {
        if (data.stations) {
          setStations(data.stations);
          if (!stationId && data.stations.length > 0) {
            setStationId(data.stations[0].id);
          }
        }
      })
      .catch(() => {});
  }, [stationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/faults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stationId,
          category,
          severity,
          description,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit fault report");
        return;
      }

      setSuccess(true);
      setDescription("");
    } catch {
      setError("Network error reporting fault");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col pb-24 transition-colors duration-200">
      <Navbar />
      <DemoControlBar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <AlertTriangle className="w-7 h-7 text-[var(--danger)]" />
            Report Charger Malfunction
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Crowdsourced telemetry and fault reporting helps operators repair EVSE bottlenecks faster.
          </p>
        </div>

        <div className="card-level-2 p-6 space-y-4">
          {success && (
            <div className="p-3.5 rounded-xl bg-[var(--primary-accent)]/15 border border-[var(--primary-accent)]/30 text-xs text-[var(--primary-accent)] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Fault ticket submitted to CPO dispatch. Station status updated.</span>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-[var(--danger)]/15 border border-[var(--danger)]/30 text-xs text-[var(--danger)]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-[var(--text-secondary)] mb-1 font-medium">
                Charging Station
              </label>
              <select
                value={stationId}
                onChange={(e) => setStationId(e.target.value)}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--primary-accent)]"
              >
                {stations.map((stn) => (
                  <option key={stn.id} value={stn.id}>
                    {stn.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[var(--text-secondary)] mb-1 font-medium">
                Issue Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--primary-accent)]"
              >
                <option value="CONNECTOR_DAMAGED">Connector / Gun Damaged or Won&apos;t Lock</option>
                <option value="CHARGER_NOT_WORKING">Charger Completely Unresponsive / Screen Blank</option>
                <option value="CHARGING_TOO_SLOW">Severe Power Drop (&lt;20 kW delivered on DC)</option>
                <option value="PAYMENT_ISSUE">RFID / QR / Payment Handshake Failure</option>
                <option value="STATION_INACCESSIBLE">Parking Bay Blocked by ICE Vehicle (ICEing)</option>
                <option value="OTHER">Other Technical Problem</option>
              </select>
            </div>

            <div>
              <label className="block text-[var(--text-secondary)] mb-1 font-medium">
                Severity Level
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { level: "LOW", label: "Minor" },
                  { level: "MEDIUM", label: "Moderate" },
                  { level: "HIGH", label: "High" },
                  { level: "CRITICAL", label: "Critical" },
                ].map((s) => (
                  <button
                    key={s.level}
                    type="button"
                    onClick={() => setSeverity(s.level as any)}
                    className={`py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                      severity === s.level
                        ? "bg-[var(--primary-accent)] text-[#0E100F] border-[var(--primary-accent)] font-bold shadow-sm"
                        : "bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[var(--text-secondary)] mb-1 font-medium">
                Problem Description
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what occurred (e.g. CCS2 gun latch broken, failed communication handshake, display error code)..."
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-3 text-[var(--text-primary)] outline-none focus:border-[var(--primary-accent)] placeholder:text-[var(--text-muted)]"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-[var(--danger)] hover:bg-[var(--danger)]/90 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? "Submitting..." : "Submit Malfunction Report"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
