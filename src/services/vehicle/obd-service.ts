export interface ObdTelemetryFrame {
  timestamp: string;
  protocol: "ISO 15765-4 (CAN 11/500)" | "SAE J1939";
  stateOfChargePercent: number;
  packVoltageVolts: number;
  packCurrentAmps: number;
  batteryTempCelsius: number;
  estimatedRangeKm: number;
  vehicleSpeedKph: number;
  odometerKm: number;
  isSimulated: boolean;
}

export class ObdBridgeService {
  generateTelemetryPacket(baseSoc: number, isCharging = false): ObdTelemetryFrame {
    // Generate realistic CAN bus telemetry payload
    const voltage = 380 + (baseSoc / 100) * 45; // 380V to 425V
    const current = isCharging ? -120 : 0; // negative indicates charging into pack
    const temp = isCharging ? 34.5 : 29.8;
    const estRange = Math.round((baseSoc / 100) * 340);

    return {
      timestamp: new Date().toISOString(),
      protocol: "ISO 15765-4 (CAN 11/500)",
      stateOfChargePercent: baseSoc,
      packVoltageVolts: Number(voltage.toFixed(1)),
      packCurrentAmps: current,
      batteryTempCelsius: temp,
      estimatedRangeKm: estRange,
      vehicleSpeedKph: 0,
      odometerKm: 14820,
      isSimulated: true,
    };
  }

  getDiagnosticTroubleCodes(): Array<{ code: string; system: string; description: string }> {
    return [
      {
        code: "P0A80",
        system: "High Voltage Battery Management System",
        description: "BMS state healthy — cell variance within 12mV nominal range",
      },
    ];
  }
}

export const obdBridgeService = new ObdBridgeService();
