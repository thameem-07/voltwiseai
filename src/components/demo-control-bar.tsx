"use client";

import React, { useState } from "react";
import { Sliders, RefreshCw, CheckCircle2, Zap, Settings } from "lucide-react";
import { EvSimulationModal } from "./ev-simulation-modal";

interface DemoControlBarProps {
  onScenarioChange?: () => void;
  currentBattery?: number;
}

export function DemoControlBar({ onScenarioChange, currentBattery = 45 }: DemoControlBarProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeMessage, setActiveMessage] = useState<string | null>(null);

  const handleReset = async () => {
    try {
      await fetch("/api/demo/reset", { method: "POST" });
      setActiveMessage("Grid baseline restored");
      setTimeout(() => setActiveMessage(null), 3000);
      if (onScenarioChange) onScenarioChange();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-4xl">
        <div className="bg-[var(--bg-surface)]/95 backdrop-blur-md border border-[var(--border-subtle)] rounded-xl shadow-xl p-2.5 text-xs text-[var(--text-primary)]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--primary-accent)]"></span>
              </span>
              <span className="font-semibold tracking-wider text-[var(--text-primary)] text-[11px]">
                EV SIMULATION
              </span>
              <span className="bg-[var(--bg-elevated)] text-[var(--text-muted)] px-2 py-0.5 rounded text-[10px] hidden sm:inline border border-[var(--border-subtle)]">
                Telemetry & Network Testbed
              </span>
            </div>

            {activeMessage && (
              <div className="text-[var(--primary-accent)] flex items-center gap-1 font-medium truncate max-w-[240px] text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{activeMessage}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                title="Reset to Baseline"
                className="flex items-center gap-1 bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] text-[11px] transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span className="hidden sm:inline">Reset</span>
              </button>

              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="btn-primary flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Open EV Simulation</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <EvSimulationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onApplied={() => {
          if (onScenarioChange) onScenarioChange();
        }}
        initialBattery={currentBattery}
      />
    </>
  );
}
