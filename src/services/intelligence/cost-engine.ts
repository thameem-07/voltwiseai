import { StationPrice } from "@/types";

export interface CostCalculationBreakdown {
  energyNeededKwh: number;
  ratePerKwh: number;
  energyCost: number;
  sessionFee: number;
  parkingFee: number;
  totalCostInr: number;
  currency: string;
  summaryText: string;
}

export function calculateChargingCost(
  energyNeededKwh: number,
  price: StationPrice
): CostCalculationBreakdown {
  const energyCost = Math.round(energyNeededKwh * price.pricePerKwh * 100) / 100;
  const sessionFee = price.sessionFee || 0;
  const parkingFee = price.parkingFee || 0;
  const totalCostInr = Math.round(energyCost + sessionFee + parkingFee);

  return {
    energyNeededKwh,
    ratePerKwh: price.pricePerKwh,
    energyCost,
    sessionFee,
    parkingFee,
    totalCostInr,
    currency: price.currency || "INR",
    summaryText: `${energyNeededKwh} kWh × ₹${price.pricePerKwh}/kWh + ₹${sessionFee} session fee = ₹${totalCostInr}`,
  };
}
