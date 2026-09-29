"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Spotlight } from "@/components/ui/spotlight";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import {
  Zap,
  ArrowRight,
  BatteryCharging,
  Clock,
  Radio,
  BarChart3,
  ShieldCheck,
  CheckCircle2,
  Navigation,
  Layers,
  Shield,
  Route,
  MapPin,
  Sparkles,
} from "lucide-react";
import { Vehicle } from "@/types";

export default function LandingPage() {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [stationCount, setStationCount] = useState(8);

  const fetchInitial = () => {
    fetch("/api/vehicle")
      .then((res) => res.json())
      .then((data) => {
        if (data.vehicle) setVehicle(data.vehicle);
      })
      .catch(() => {});

    fetch("/api/stations")
      .then((res) => res.json())
      .then((data) => {
        if (data.count) setStationCount(data.count);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchInitial();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col relative overflow-hidden transition-colors duration-200">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Background Beams Layer (Subtle EV energy / route beams) */}
        <BackgroundBeams className="absolute inset-0 z-0 pointer-events-none" />

        {/* Subtle Aceternity Spotlight */}
        <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="var(--primary-accent)" />

        <div className="relative z-10 text-center max-w-3xl mx-auto space-y-6">
          {/* Product Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[var(--primary-accent)] animate-pulse"></span>
            <span className="font-semibold text-[var(--text-primary)]">EV Charging & Route Intelligence Platform</span>
            <span className="text-[var(--text-muted)]">•</span>
            <span className="text-[var(--primary-accent)] font-medium">India-Wide Coverage</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[var(--text-primary)] leading-[1.08]">
            Charge Smarter. <br />
            <span className="text-[var(--primary-accent)] inline-block">Wait Less.</span>
          </h1>

          {/* Subheading */}
          <p className="text-base sm:text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto font-normal leading-relaxed">
            Intelligent EV charging decisions powered by vehicle telemetry, charging infrastructure data and predictive intelligence.
          </p>

          {/* CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/plan-trip"
              className="btn-primary w-full sm:w-auto px-7 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Route className="w-4 h-4" />
              Plan Your Trip
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/map"
              className="btn-secondary w-full sm:w-auto px-7 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
            >
              <Navigation className="w-4 h-4 text-[var(--info)]" />
              Explore Charging Map
            </Link>
          </div>

          {/* Quick Metrics Ticker */}
          <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto text-left">
            <div className="card-level-3 p-3.5">
              <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider block font-medium">Infrastructure</span>
              <span className="text-base font-bold text-[var(--text-primary)] mt-0.5 block">India-Wide Hubs</span>
            </div>
            <div className="card-level-3 p-3.5">
              <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider block font-medium">Safety Reserve</span>
              <span className="text-base font-bold text-[var(--primary-accent)] mt-0.5 block">15% Safe Buffer</span>
            </div>
            <div className="card-level-3 p-3.5">
              <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider block font-medium">Route Engine</span>
              <span className="text-base font-bold text-[var(--info)] mt-0.5 block">OSRM Corridors</span>
            </div>
            <div className="card-level-3 p-3.5">
              <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider block font-medium">Decision Engine</span>
              <span className="text-base font-bold text-[var(--warning)] mt-0.5 block">Multi-Factor Physics</span>
            </div>
          </div>
        </div>
      </section>

      {/* Product Value Section */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-[var(--border-subtle)]">
        <div className="max-w-3xl mx-auto text-center mb-10">
          <span className="text-xs uppercase font-bold text-[var(--primary-accent)] tracking-widest">
            Core Capabilities
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] mt-2">
            Built Around Your EV Journey
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            VoltWise AI integrates real-time vehicle telemetry with live charging network intelligence so you travel without surprises.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          <div className="card-level-2 p-5 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--primary-accent)]/15 border border-[var(--primary-accent)]/30 flex items-center justify-center text-[var(--primary-accent)]">
              <BatteryCharging className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-[var(--text-primary)]">
              Plan trips around your battery
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Dynamic energy consumption models account for usable battery capacity, highway speeds, and a strict 15% minimum arrival reserve.
            </p>
          </div>

          <div className="card-level-2 p-5 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--info)]/15 border border-[var(--info)]/30 flex items-center justify-center text-[var(--info)]">
              <Route className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-[var(--text-primary)]">
              Find charging stations along your route
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              True route corridor discovery analyzes your actual OSRM travel LineString rather than simple straight lines, ensuring minimal highway detours.
            </p>
          </div>

          <div className="card-level-2 p-5 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--warning)]/15 border border-[var(--warning)]/30 flex items-center justify-center text-[var(--warning)]">
              <Radio className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-[var(--text-primary)]">
              Monitor vehicle telemetry
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Track live State of Charge (SoC), charging speed, and port compatibility through connected vehicle diagnostics or manual vehicle profiling.
            </p>
          </div>

          <div className="card-level-2 p-5 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--primary-accent)]/15 border border-[var(--primary-accent)]/30 flex items-center justify-center text-[var(--primary-accent)]">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-[var(--text-primary)]">
              Get intelligent charging recommendations
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Receive explainable stop recommendations with arrival battery projections, optimal charging targets (70–85%), and charging time estimates.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-[var(--border-subtle)]">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <span className="text-xs uppercase font-bold text-[var(--info)] tracking-widest">
            Step-by-Step Workflow
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] mt-2">
            How It Works
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            VoltWise AI simplifies long-distance and daily electric vehicle travel into four clear phases.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {/* Step 1 */}
          <div className="card-level-2 p-6 rounded-2xl space-y-3 relative border border-[var(--border-subtle)]">
            <span className="text-xs font-mono font-bold text-[var(--primary-accent)] bg-[var(--primary-accent)]/10 px-2.5 py-1 rounded-md">
              01
            </span>
            <h3 className="font-bold text-sm text-[var(--text-primary)] pt-1">
              Connect your vehicle
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Connect through supported vehicle data sources or enter vehicle information manually to calibrate battery capacity and charging specs.
            </p>
          </div>

          {/* Step 2 */}
          <div className="card-level-2 p-6 rounded-2xl space-y-3 relative border border-[var(--border-subtle)]">
            <span className="text-xs font-mono font-bold text-[var(--info)] bg-[var(--info)]/10 px-2.5 py-1 rounded-md">
              02
            </span>
            <h3 className="font-bold text-sm text-[var(--text-primary)] pt-1">
              Plan your journey
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Choose your starting point using automatic browser GPS or address search, and select your destination anywhere in India.
            </p>
          </div>

          {/* Step 3 */}
          <div className="card-level-2 p-6 rounded-2xl space-y-3 relative border border-[var(--border-subtle)]">
            <span className="text-xs font-mono font-bold text-[var(--warning)] bg-[var(--warning)]/10 px-2.5 py-1 rounded-md">
              03
            </span>
            <h3 className="font-bold text-sm text-[var(--text-primary)] pt-1">
              Analyze your route
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              VoltWise AI evaluates route distance, elevation, highway consumption, battery range, and reachable charging infrastructure.
            </p>
          </div>

          {/* Step 4 */}
          <div className="card-level-2 p-6 rounded-2xl space-y-3 relative border border-[var(--primary-accent)]/40">
            <span className="text-xs font-mono font-bold text-[var(--primary-accent)] bg-[var(--primary-accent)]/10 px-2.5 py-1 rounded-md">
              04
            </span>
            <h3 className="font-bold text-sm text-[var(--primary-accent)] pt-1">
              Charge intelligently
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Receive charging-stop recommendations based on your vehicle model, battery reserve, detour distance, and journey requirements.
            </p>
          </div>
        </div>
      </section>

      {/* Bento Grid Feature Section */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-[var(--border-subtle)]">
        <div className="max-w-3xl mx-auto text-center mb-10">
          <span className="text-xs uppercase font-bold text-[var(--text-muted)] tracking-widest">
            Architecture
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] mt-2">
            Enterprise EV Intelligence Infrastructure
          </h2>
        </div>

        <BentoGrid>
          <BentoGridItem
            title="Vehicle Telemetry & Diagnostics Bridge"
            description="Supports cloud OEM APIs with vehicle diagnostics telemetry ingestion to provide precision range calculations."
            icon={<Radio className="w-5 h-5 text-[var(--primary-accent)]" />}
            className="md:col-span-2"
            header={
              <div className="w-full h-32 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)] p-4 flex flex-col justify-between font-mono text-xs">
                <div className="flex items-center justify-between text-[11px] text-[var(--info)]">
                  <span>[VEHICLE TELEMETRY BRIDGE]</span>
                  <span className="text-[var(--primary-accent)]">ISO 15765-4 Active</span>
                </div>
                <div className="text-[var(--text-secondary)] text-[11px] space-y-1">
                  <div>Telemetry Feed: SoC: 45% | Voltage: 388.4V | Pack Health: 98%</div>
                  <div className="text-[var(--primary-accent)]">BMS State: Calibrated & Ready for Long-Distance Routing</div>
                </div>
              </div>
            }
          />

          <BentoGridItem
            title="Multi-Protocol Data Normalization"
            description="Continuous normalization of Open Charge Map directory data, highway corridors, and operator status updates."
            icon={<Layers className="w-5 h-5 text-[var(--info)]" />}
            header={
              <div className="w-full h-32 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)] p-3 flex flex-col justify-center items-center text-center">
                <ShieldCheck className="w-7 h-7 text-[var(--primary-accent)] mb-2" />
                <span className="text-xs font-bold text-[var(--text-primary)]">Verified Station Directory</span>
                <span className="text-[10px] text-[var(--text-muted)]">Connector matching & deduplication</span>
              </div>
            }
          />

          <BentoGridItem
            title="Queue Time & Congestion Prediction"
            description="Predictive queuing model estimating wait times based on EVSE charging power, battery size, and active bay usage."
            icon={<Clock className="w-5 h-5 text-[var(--warning)]" />}
            header={
              <div className="w-full h-32 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)] p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">Station Congestion</span>
                  <span className="text-[var(--primary-accent)] font-bold">Low Wait (~5 min)</span>
                </div>
                <div className="w-full bg-[var(--bg-surface)] h-2 rounded-full overflow-hidden border border-[var(--border-subtle)]">
                  <div className="bg-[var(--primary-accent)] h-full w-[25%] rounded-full"></div>
                </div>
                <span className="text-[10px] text-[var(--text-muted)]">Saves valuable transit time vs congested urban hubs</span>
              </div>
            }
          />

          <BentoGridItem
            title="Highway Corridor Bottleneck Analytics"
            description="Heatmap analysis highlighting high-density travel corridors requiring additional DC fast charging capacity."
            icon={<BarChart3 className="w-5 h-5 text-[var(--info)]" />}
            className="md:col-span-2"
            header={
              <div className="w-full h-32 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)] p-4 flex flex-col justify-between text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[var(--text-primary)]">Corridor Capacity Analysis</span>
                  <span className="text-[var(--info)] bg-[var(--info)]/10 px-2 py-0.5 rounded font-bold text-[10px]">MONITORED</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Continuous highway corridor telemetry evaluation across NH48, NH44, NH75, and regional EV transit routes.
                </p>
              </div>
            }
          />
        </BentoGrid>
      </section>

      {/* Product Call To Action Section */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        <div className="card-level-1 p-8 sm:p-10 text-center relative shadow-lg">
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
            Drive With Confidence Across India
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-xl mx-auto">
            Say goodbye to range anxiety and long charging queues. Start planning smarter EV journeys with VoltWise AI today.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/plan-trip"
              className="btn-primary w-full sm:w-auto px-7 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Route className="w-4 h-4" />
              Plan Your Trip
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/map"
              className="btn-secondary w-full sm:w-auto px-7 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
            >
              <Navigation className="w-4 h-4 text-[var(--info)]" />
              Explore Charging Map
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-[var(--border-subtle)] px-4 text-center text-xs text-[var(--text-muted)]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <Zap className="w-4 h-4 text-[var(--primary-accent)]" />
            <span className="font-semibold text-[var(--text-primary)]">VoltWise AI</span>
            <span>— Intelligent EV Charging Decisions</span>
          </div>

          <div>
            © 2026 VoltWise AI • EV mobility, route corridor planning and charging infrastructure intelligence.
          </div>
        </div>
      </footer>
    </div>
  );
}
