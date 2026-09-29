export interface ChargingTimeEstimate {
  currentPercent: number;
  targetPercent: number;
  batteryCapacityKwh: number;
  energyNeededKwh: number;
  chargerPowerKw: number;
  effectivePowerKw: number;
  estimatedTimeMinutes: number;
  timeTo80PercentMinutes: number;
  explanation: string;
}

export function calculateChargingTime(
  currentPercent: number,
  targetPercent: number,
  batteryCapacityKwh: number,
  chargerPowerKw: number,
  vehicleMaxKw = 120
): ChargingTimeEstimate {
  const boundedCurrent = Math.max(0, Math.min(100, currentPercent));
  const boundedTarget = Math.max(boundedCurrent, Math.min(100, targetPercent));

  const percentDelta = boundedTarget - boundedCurrent;
  const energyNeededKwh = Number(((percentDelta / 100) * batteryCapacityKwh).toFixed(2));

  // The actual power is bottlenecked by either the charger or vehicle onboard limit
  const effectivePowerKw = Math.min(chargerPowerKw, vehicleMaxKw);

  // Non-linear EV charging physics model:
  // Phase 1 (up to 80%): Efficient fast DC/AC charging at ~85% theoretical rate
  // Phase 2 (80% to 100%): CC/CV taper curve at ~35% rate to protect battery cells
  let totalMinutes = 0;
  let timeTo80Minutes = 0;

  if (boundedCurrent < 80) {
    const phase1Target = Math.min(80, boundedTarget);
    const phase1Kwh = ((phase1Target - boundedCurrent) / 100) * batteryCapacityKwh;
    // 0.88 charging efficiency
    const phase1Hours = phase1Kwh / (effectivePowerKw * 0.88);
    timeTo80Minutes = Math.round(phase1Hours * 60);
    totalMinutes += timeTo80Minutes;
  }

  if (boundedTarget > 80) {
    const phase2Start = Math.max(80, boundedCurrent);
    const phase2Kwh = ((boundedTarget - phase2Start) / 100) * batteryCapacityKwh;
    // Tapered rate ~ 35% of max power
    const phase2Power = Math.max(7.2, effectivePowerKw * 0.35);
    const phase2Hours = phase2Kwh / (phase2Power * 0.85);
    totalMinutes += Math.round(phase2Hours * 60);
  }

  // Minimum safety floor of 5 minutes if there is energy needed
  if (energyNeededKwh > 0 && totalMinutes < 5) {
    totalMinutes = 5;
  }

  return {
    currentPercent: boundedCurrent,
    targetPercent: boundedTarget,
    batteryCapacityKwh,
    energyNeededKwh,
    chargerPowerKw,
    effectivePowerKw,
    estimatedTimeMinutes: totalMinutes,
    timeTo80PercentMinutes: timeTo80Minutes,
    explanation: `${energyNeededKwh} kWh needed at ~${effectivePowerKw} kW effective speed (80% taper applied)`,
  };
}
