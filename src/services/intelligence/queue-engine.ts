import { Charger, QueueEntry } from "@/types";

export interface QueueEstimate {
  stationId: string;
  totalChargers: number;
  availableChargers: number;
  occupiedChargers: number;
  faultedChargers: number;
  queueLength: number;
  estimatedWaitMinutes: number;
  congestionLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  congestionScore: number; // 0 to 100
  isEstimatedByAi: boolean;
}

export function calculateQueueMetrics(
  stationId: string,
  chargers: Charger[],
  queues: QueueEntry[]
): QueueEstimate {
  const total = chargers.length;
  const available = chargers.filter((c) => c.status === "AVAILABLE").length;
  const occupied = chargers.filter((c) => c.status === "OCCUPIED").length;
  const faulted = chargers.filter((c) => c.status === "FAULTED" || c.status === "OFFLINE").length;
  const queueLength = queues.length;

  let estimatedWaitMinutes = 0;

  if (available > 0 && queueLength === 0) {
    estimatedWaitMinutes = 0;
  } else if (available > 0 && queueLength > 0) {
    // Some chargers free, but queue exists (turnover in progress)
    estimatedWaitMinutes = Math.max(2, Math.round((queueLength / available) * 6));
  } else {
    // All working chargers occupied
    const activeWorking = Math.max(1, total - faulted);
    // Average remaining charging session time estimate: ~25 mins on DC Fast (60-120kW)
    const avgSessionMinutes = 24;
    // Turnover rate = working chargers / avg session time
    const turnoverRatePerMin = activeWorking / avgSessionMinutes;
    // Wait time for queue = queueLength / turnoverRate
    estimatedWaitMinutes = Math.round((queueLength + 1) / turnoverRatePerMin);
  }

  // Calculate congestion score (0 - 100)
  const occupancyRatio = total > 0 ? (occupied + queueLength) / total : 0;
  let congestionScore = Math.min(100, Math.round(occupancyRatio * 50 + (queueLength * 12)));
  if (faulted > 0 && total > 0) {
    congestionScore = Math.min(100, congestionScore + Math.round((faulted / total) * 20));
  }

  let congestionLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
  if (congestionScore >= 80 || estimatedWaitMinutes >= 30) {
    congestionLevel = "CRITICAL";
  } else if (congestionScore >= 55 || estimatedWaitMinutes >= 15) {
    congestionLevel = "HIGH";
  } else if (congestionScore >= 30 || estimatedWaitMinutes >= 5) {
    congestionLevel = "MEDIUM";
  }

  return {
    stationId,
    totalChargers: total,
    availableChargers: available,
    occupiedChargers: occupied,
    faultedChargers: faulted,
    queueLength,
    estimatedWaitMinutes,
    congestionLevel,
    congestionScore,
    isEstimatedByAi: true,
  };
}
