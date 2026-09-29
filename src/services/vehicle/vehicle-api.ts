export interface OemVehicleAuthStatus {
  supported: boolean;
  connected: boolean;
  providerName: string;
  errorMessage?: string;
  telemetryAvailable: boolean;
}

export class VehicleApiService {
  private baseUrl: string | undefined;
  private clientId: string | undefined;
  private isSimulation: boolean;

  constructor() {
    this.baseUrl = process.env.VEHICLE_API_BASE_URL;
    this.clientId = process.env.VEHICLE_API_CLIENT_ID;
    this.isSimulation = process.env.VEHICLE_API_SIMULATION !== "false";
  }

  isConfigured(): boolean {
    return Boolean(this.baseUrl && this.clientId) && !this.isSimulation;
  }

  async checkVehicleApiCompatibility(make: string, model: string): Promise<OemVehicleAuthStatus> {
    const supportedOems = ["tesla", "hyundai", "kia", "audi", "bmw", "mercedes"];
    const isSupported = supportedOems.some((m) => make.toLowerCase().includes(m));

    if (!isSupported) {
      return {
        supported: false,
        connected: false,
        providerName: `${make} OEM Telemetry API`,
        errorMessage: `Direct cloud telemetry is not available for ${make} ${model}. Please use OBD-II device bridge or manual telemetry entry.`,
        telemetryAvailable: false,
      };
    }

    return {
      supported: true,
      connected: true,
      providerName: `${make} Connected Fleet API`,
      telemetryAvailable: true,
    };
  }

  // Generate OAuth2 connect URL for real integrations
  getAuthorizationUrl(redirectUri: string, state: string): string {
    if (!this.isConfigured()) {
      return `/vehicle/connect-callback?simulated=true&state=${state}`;
    }
    return `${this.baseUrl}/oauth/authorize?client_id=${this.clientId}&response_type=code&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&state=${state}&scope=vehicle_state%20vehicle_location%20vehicle_charging`;
  }
}

export const vehicleApiService = new VehicleApiService();
