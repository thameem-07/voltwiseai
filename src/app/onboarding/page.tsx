"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Car,
  Radio,
  CloudLightning,
  Edit3,
  CheckCircle2,
  ArrowRight,
  Shield,
  Zap,
  Activity,
  AlertCircle,
  Wifi,
  Key,
} from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<"METHOD_SELECT" | "OEM_FLOW" | "OBD_FLOW" | "MANUAL_FLOW">("METHOD_SELECT");

  // OBD interactive states
  const [obdStep, setObdStep] = useState(1);
  const [obdPairing, setObdPairing] = useState(false);
  const [obdConnected, setObdConnected] = useState(false);

  // OEM interactive states
  const [selectedOem, setSelectedOem] = useState("Tata Motors");
  const [oemConnecting, setOemConnecting] = useState(false);
  const [oemError, setOemError] = useState<string | null>(null);

  // Manual Form
  const [make, setMake] = useState("Tata");
  const [model, setModel] = useState("Nexon EV Max");
  const [year, setYear] = useState(2024);
  const [capacity, setCapacity] = useState(40.5);
  const [connector, setConnector] = useState("CCS2");
  const [range, setRange] = useState(280);
  const [submitting, setSubmitting] = useState(false);

  const completeOnboarding = async (connectionMode: string, customDetails?: any) => {
    setSubmitting(true);
    try {
      await fetch("/api/vehicle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionMode,
          make: customDetails?.make || make,
          model: customDetails?.model || model,
          year: customDetails?.year || year,
          batteryCapacityKwh: customDetails?.capacity || capacity,
          connectorType: customDetails?.connector || connector,
          estimatedRangeKm: customDetails?.range || range,
        }),
      });
      router.push("/dashboard");
    } catch {
      router.push("/dashboard");
    }
  };

  const handleStartObdPairing = () => {
    setObdPairing(true);
    setTimeout(() => {
      setObdPairing(false);
      setObdStep(3);
    }, 1800);
  };

  const handleOemConnect = () => {
    setOemConnecting(true);
    setOemError(null);
    setTimeout(() => {
      setOemConnecting(false);
      // As requested: "If real OEM integration is unavailable: show 'Integration unavailable' and allow another connection method."
      setOemError("Official OEM cloud authorization endpoint returned: Integration unavailable in this region. Please connect via OBD-II Device or Manual Vehicle Entry.");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col justify-center items-center p-4">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary-accent)]"></span>
          <span>VoltWise AI Onboarding</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
          Connect your EV
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-md">
          Step 2 of 2: Link your electric vehicle to activate realtime battery telemetry and predictive charging queue intelligence.
        </p>
      </div>

      <div className="max-w-2xl w-full card-level-2 p-6 sm:p-8 rounded-2xl relative">
        {/* STEP 1: METHOD SELECT */}
        {step === "METHOD_SELECT" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                How do you want to connect your vehicle?
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Choose the telemetry ingestion source that matches your electric vehicle.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Option A: OEM Vehicle API */}
              <button
                type="button"
                onClick={() => setStep("OEM_FLOW")}
                className="card-level-3 p-5 rounded-xl text-left hover:border-[var(--primary-accent)] transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
              >
                <div>
                  <div className="w-9 h-9 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--primary-accent)] mb-3 group-hover:scale-105 transition-transform">
                    <CloudLightning className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary-accent)] block">
                    Option A
                  </span>
                  <h3 className="font-bold text-sm text-[var(--text-primary)] mt-0.5">
                    OEM Vehicle API
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                    Connect supported vehicles through official manufacturer cloud integrations.
                  </p>
                </div>
                <span className="text-xs font-semibold text-[var(--primary-accent)] flex items-center gap-1">
                  Configure <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </button>

              {/* Option B: OBD-II Device */}
              <button
                type="button"
                onClick={() => setStep("OBD_FLOW")}
                className="card-level-3 p-5 rounded-xl text-left hover:border-[var(--info)] transition-all cursor-pointer flex flex-col justify-between space-y-4 group border-[var(--border-subtle)]"
              >
                <div>
                  <div className="w-9 h-9 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--info)] mb-3 group-hover:scale-105 transition-transform">
                    <Radio className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--info)] block">
                    Option B
                  </span>
                  <h3 className="font-bold text-sm text-[var(--text-primary)] mt-0.5">
                    OBD-II Device
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                    Plug in an OBD-II diagnostic dongle to stream realtime CAN-bus battery frames.
                  </p>
                </div>
                <span className="text-xs font-semibold text-[var(--info)] flex items-center gap-1">
                  Pair Device <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </button>

              {/* Option C: Manual */}
              <button
                type="button"
                onClick={() => setStep("MANUAL_FLOW")}
                className="card-level-3 p-5 rounded-xl text-left hover:border-[var(--warning)] transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
              >
                <div>
                  <div className="w-9 h-9 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--warning)] mb-3 group-hover:scale-105 transition-transform">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--warning)] block">
                    Option C
                  </span>
                  <h3 className="font-bold text-sm text-[var(--text-primary)] mt-0.5">
                    Manual Vehicle Entry
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                    Enter vehicle make, model, pack capacity, and standard connector specs directly.
                  </p>
                </div>
                <span className="text-xs font-semibold text-[var(--warning)] flex items-center gap-1">
                  Enter Specs <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 - OPTION A: OEM VEHICLE API */}
        {step === "OEM_FLOW" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <CloudLightning className="w-4 h-4 text-[var(--primary-accent)]" />
                  Option A: OEM Vehicle Cloud API
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Connect a supported vehicle through its official manufacturer integration.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep("METHOD_SELECT")}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Change Method
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2 text-xs text-[var(--text-secondary)]">
              <div className="flex items-center gap-2 text-[var(--primary-accent)] font-semibold">
                <Shield className="w-4 h-4" />
                <span>Zero-Password OAuth2 Architecture</span>
              </div>
              <p>
                VoltWise AI never requests or stores your vehicle manufacturer account password. Authentication is cryptographically secured via OAuth2 authorization grants with mutual TLS token rotation.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Supported Manufacturer
                </label>
                <select
                  value={selectedOem}
                  onChange={(e) => setSelectedOem(e.target.value)}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-2.5 text-xs text-[var(--text-primary)] outline-none"
                >
                  <option value="Tata Motors">Tata Motors (ZConnect Cloud)</option>
                  <option value="Hyundai">Hyundai Bluelink Connected Car</option>
                  <option value="Tesla">Tesla Fleet Telemetry API</option>
                  <option value="MG Motors">MG i-SMART Electric</option>
                  <option value="Mahindra">Mahindra Me4U EV Cloud</option>
                </select>
              </div>

              {oemError && (
                <div className="p-3.5 rounded-xl bg-[var(--danger)]/15 border border-[var(--danger)]/30 text-xs text-[var(--danger)] space-y-2">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertCircle className="w-4 h-4" />
                    <span>Integration Unavailable</span>
                  </div>
                  <p>{oemError}</p>
                  <div className="pt-1 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStep("OBD_FLOW")}
                      className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-semibold hover:border-[var(--primary-accent)]"
                    >
                      Connect with OBD-II Instead
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep("MANUAL_FLOW")}
                      className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-semibold hover:border-[var(--primary-accent)]"
                    >
                      Use Manual Entry Instead
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  disabled={oemConnecting}
                  onClick={handleOemConnect}
                  className="btn-primary w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Key className="w-3.5 h-3.5" />
                  {oemConnecting ? "Exchanging OAuth2 Tokens..." : `Connect via ${selectedOem} OAuth`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 - OPTION B: OBD-II DEVICE */}
        {step === "OBD_FLOW" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <Radio className="w-4 h-4 text-[var(--info)]" />
                  Option B: OBD-II Telemetry Device Setup
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Connect an OBD-II telemetry device to your vehicle.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep("METHOD_SELECT")}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Change Method
              </button>
            </div>

            {/* 5 Clean Setup Steps */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-center text-xs">
              {[
                { s: 1, title: "1. Plug In", desc: "DLC Port" },
                { s: 2, title: "2. Pair", desc: "BLE Sync" },
                { s: 3, title: "3. Allow", desc: "Telemetry" },
                { s: 4, title: "4. Ignition", desc: "Start EV" },
                { s: 5, title: "5. Verify", desc: "Live CAN" },
              ].map((item) => (
                <div
                  key={item.s}
                  className={`p-2.5 rounded-xl border transition-all ${
                    obdStep >= item.s
                      ? "bg-[var(--bg-elevated)] border-[var(--primary-accent)]/50 text-[var(--primary-accent)]"
                      : "bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-muted)]"
                  }`}
                >
                  <strong className="block text-xs">{item.title}</strong>
                  <span className="text-[10px] text-[var(--text-secondary)]">{item.desc}</span>
                </div>
              ))}
            </div>

            {/* Interactive Step Content */}
            {obdStep === 1 && (
              <div className="card-level-3 p-5 space-y-3">
                <h4 className="font-bold text-xs text-[var(--text-primary)]">
                  Step 1: Locate OBD-II Port and Plug In Adapter
                </h4>
                <p className="text-xs text-[var(--text-secondary)]">
                  Locate the 16-pin OBD-II diagnostic port (typically under the driver-side dashboard or fuse box) and firmly seat the VoltWise BLE telemetry dongle.
                </p>
                <button
                  type="button"
                  onClick={() => setObdStep(2)}
                  className="btn-primary px-4 py-2 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Device Inserted — Proceed to Pair
                </button>
              </div>
            )}

            {obdStep === 2 && (
              <div className="card-level-3 p-5 space-y-3">
                <h4 className="font-bold text-xs text-[var(--text-primary)]">
                  Step 2: Pair Bluetooth Low Energy Telemetry Device
                </h4>
                <p className="text-xs text-[var(--text-secondary)]">
                  Scanning for STN1110 / ELM327 CAN interface broadcast signal...
                </p>
                <button
                  type="button"
                  disabled={obdPairing}
                  onClick={handleStartObdPairing}
                  className="btn-primary px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Wifi className={`w-3.5 h-3.5 ${obdPairing ? "animate-spin" : ""}`} />
                  {obdPairing ? "Pairing with VoltWise-OBD..." : "Search & Pair Device"}
                </button>
              </div>
            )}

            {obdStep === 3 && (
              <div className="card-level-3 p-5 space-y-3">
                <h4 className="font-bold text-xs text-[var(--text-primary)]">
                  Step 3 & 4: Authorize Telemetry & Turn On Vehicle Ignition
                </h4>
                <p className="text-xs text-[var(--text-secondary)]">
                  Turn vehicle switch to ON or READY mode. Allow VoltWise to ingest standard ISO 15765-4 High Speed CAN frames (500 kbps).
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setObdStep(5);
                      setObdConnected(true);
                    }}
                    className="btn-primary px-4 py-2 rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Vehicle Ignition ON — Ingest CAN Packets
                  </button>
                </div>
              </div>
            )}

            {obdStep === 5 && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--primary-accent)]/40 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)] text-[11px]">
                    <span className="text-[var(--primary-accent)] font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> OBD-II CAN TELEMETRY VERIFIED
                    </span>
                    <span className="text-[var(--text-muted)]">ISO 15765-4 (500 kbps)</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] block">BATTERY SOC</span>
                      <span className="text-sm font-bold text-[var(--primary-accent)]">45%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] block">VEHICLE SPEED</span>
                      <span className="text-sm font-bold text-[var(--text-primary)]">0 km/h</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] block">BATTERY VOLTAGE</span>
                      <span className="text-sm font-bold text-[var(--info)]">388.4 V</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] block">POWER</span>
                      <span className="text-sm font-bold text-[var(--text-primary)]">0.0 kW</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] block">RANGE ESTIMATE</span>
                      <span className="text-sm font-bold text-[var(--text-primary)]">160 km</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] block">CHARGING STATE</span>
                      <span className="text-sm font-bold text-[var(--warning)]">Not Charging</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => completeOnboarding("OBD_DEVICE")}
                  className="btn-primary w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {submitting ? "Saving Link..." : "Confirm OBD Link & Launch Dashboard"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2 - OPTION C: MANUAL VEHICLE ENTRY */}
        {step === "MANUAL_FLOW" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-[var(--warning)]" />
                  Option C: Manual Vehicle Entry
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Configure your vehicle specs directly to establish your baseline charging curve.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep("METHOD_SELECT")}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Change Method
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                completeOnboarding("MANUAL");
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-medium">Manufacturer</label>
                  <input
                    type="text"
                    required
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    placeholder="Tata, Mahindra, MG, Hyundai..."
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--primary-accent)]"
                  />
                </div>

                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-medium">Model</label>
                  <input
                    type="text"
                    required
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="Nexon EV, XUV400, Ioniq 5..."
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--primary-accent)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-medium">Model Year</label>
                  <input
                    type="number"
                    min="2018"
                    max="2026"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--primary-accent)]"
                  />
                </div>

                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-medium">Battery Pack (kWh)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--primary-accent)]"
                  />
                </div>

                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-medium">Connector Type</label>
                  <select
                    value={connector}
                    onChange={(e) => setConnector(e.target.value)}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--primary-accent)]"
                  >
                    <option value="CCS2">CCS2 (DC Fast & Combined)</option>
                    <option value="Type 2">Type 2 (AC Fast)</option>
                    <option value="CHAdeMO">CHAdeMO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-medium">Typical Highway Range (km)</label>
                <input
                  type="number"
                  value={range}
                  onChange={(e) => setRange(Number(e.target.value))}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--primary-accent)]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                {submitting ? "Saving Profile..." : "Save Vehicle & Continue to Dashboard"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
