import { ChargingStation, Charger } from "@/types";

export interface BeeRawStation {
  station_code: string;
  station_name: string;
  cpo_name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  total_guns: number;
  gun_details?: Array<{
    gun_id: string;
    connector: string;
    power_rating: number;
    status?: string;
  }>;
}

export class BeeService {
  private apiUrl: string | undefined;
  private apiKey: string | undefined;

  constructor() {
    this.apiUrl = process.env.BEE_API_URL;
    this.apiKey = process.env.BEE_API_KEY;
  }

  isConfigured(): boolean {
    return Boolean(this.apiUrl && this.apiKey);
  }

  async fetchStations(): Promise<{
    stations: ChargingStation[];
    chargersMap: Record<string, Charger[]>;
    sourceRawCount: number;
    isSimulated: boolean;
  }> {
    if (!this.isConfigured()) {
      return this.getSimulatedBeeData();
    }

    try {
      const res = await fetch(`${this.apiUrl}/stations`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        return this.getSimulatedBeeData();
      }

      const data: BeeRawStation[] = await res.json();
      return this.normalizeBeeData(data);
    } catch {
      return this.getSimulatedBeeData();
    }
  }

  // Admin file upload parser for official BEE CSV or JSON dataset
  parseImportedDataset(jsonContent: string): {
    stations: ChargingStation[];
    chargersMap: Record<string, Charger[]>;
    sourceRawCount: number;
    isSimulated: boolean;
  } {
    try {
      const parsed: BeeRawStation[] = JSON.parse(jsonContent);
      return this.normalizeBeeData(parsed);
    } catch (e) {
      throw new Error(`Invalid BEE dataset format: ${(e as Error).message}`);
    }
  }

  normalizeBeeData(rawItems: BeeRawStation[]): {
    stations: ChargingStation[];
    chargersMap: Record<string, Charger[]>;
    sourceRawCount: number;
    isSimulated: boolean;
  } {
    const stations: ChargingStation[] = [];
    const chargersMap: Record<string, Charger[]> = {};

    for (const item of rawItems) {
      const stationId = `bee_${item.station_code}`;
      const station: ChargingStation = {
        id: stationId,
        externalId: `BEE-${item.station_code}`,
        name: item.station_name,
        operator: item.cpo_name || "BEE Empanelled Operator",
        address: item.address,
        city: item.city || "Chennai",
        state: item.state || "Tamil Nadu",
        country: "India",
        latitude: item.latitude,
        longitude: item.longitude,
        openingHours: "24/7",
        source: "BEE",
        sourceId: item.station_code,
        sourceLastUpdated: new Date().toISOString(),
        localLastUpdated: new Date().toISOString(),
        verificationStatus: "VERIFIED",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const stationChargers: Charger[] = [];
      if (item.gun_details && item.gun_details.length > 0) {
        item.gun_details.forEach((gun, idx) => {
          let connectorType: Charger["connectorType"] = "CCS2";
          const rawConn = gun.connector.toLowerCase();
          if (rawConn.includes("type 2") || rawConn.includes("type2")) connectorType = "Type 2";
          else if (rawConn.includes("bharat")) connectorType = "Bharat AC-001";
          else if (rawConn.includes("gb/t") || rawConn.includes("gbt")) connectorType = "GB/T";

          stationChargers.push({
            id: `chg_${stationId}_${idx + 1}`,
            stationId,
            evseId: gun.gun_id || `BEE-GUN-${idx + 1}`,
            connectorType,
            powerKw: gun.power_rating || 60,
            chargingType: gun.power_rating >= 100 ? "DC_ULTRA_FAST" : gun.power_rating <= 22 ? "AC_SLOW" : "DC_FAST",
            status: "AVAILABLE",
            lastStatusUpdate: new Date().toISOString(),
          });
        });
      } else {
        stationChargers.push({
          id: `chg_${stationId}_1`,
          stationId,
          evseId: `BEE-GUN-1`,
          connectorType: "CCS2",
          powerKw: 60,
          chargingType: "DC_FAST",
          status: "AVAILABLE",
          lastStatusUpdate: new Date().toISOString(),
        });
      }

      stations.push(station);
      chargersMap[stationId] = stationChargers;
    }

    return {
      stations,
      chargersMap,
      sourceRawCount: rawItems.length,
      isSimulated: false,
    };
  }

  private getSimulatedBeeData() {
    const mockItems: BeeRawStation[] = [
      {
        station_code: "TN-04812",
        station_name: "Tata Power EZ Charge — Olympia Tech Park",
        cpo_name: "Tata Power",
        address: "1 SIDCO Industrial Estate, Guindy",
        city: "Chennai",
        state: "Tamil Nadu",
        pincode: "600032",
        latitude: 13.0102,
        longitude: 80.2038,
        total_guns: 3,
        gun_details: [
          { gun_id: "TP-GUN-1", connector: "CCS2", power_rating: 60 },
          { gun_id: "TP-GUN-2", connector: "CCS2", power_rating: 60 },
          { gun_id: "TP-GUN-3", connector: "Type 2", power_rating: 22 },
        ],
      },
      {
        station_code: "TN-09182",
        station_name: "Relux Electric — Anna Nagar West",
        cpo_name: "Relux Electric",
        address: "2nd Avenue, Near Anna Nagar Roundtana",
        city: "Chennai",
        state: "Tamil Nadu",
        pincode: "600040",
        latitude: 13.0850,
        longitude: 80.2101,
        total_guns: 2,
        gun_details: [
          { gun_id: "REL-GUN-1", connector: "CCS2", power_rating: 120 },
          { gun_id: "REL-GUN-2", connector: "CCS2", power_rating: 60 },
        ],
      },
    ];

    const result = this.normalizeBeeData(mockItems);
    result.isSimulated = true;
    return result;
  }
}

export const beeService = new BeeService();
