import { dbStore } from "@/lib/db-store";
import { openChargeMapService } from "./openchargemap-service";
import { beeService } from "./bee-service";
import { ocpiProvider } from "./ocpi-service";
import { StationSource, StationSyncLog } from "@/types";

export interface SyncResult {
  source: StationSource;
  recordsReceived: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  status: "SUCCESS" | "PARTIAL_SUCCESS" | "FAILED";
  log: StationSyncLog;
}

export class StationSyncService {
  async syncSource(source: StationSource): Promise<SyncResult> {
    const startedAt = new Date().toISOString();
    let recordsReceived = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let recordsFailed = 0;
    let errorMessage: string | undefined;

    try {
      if (source === "OPEN_CHARGE_MAP") {
        const ocmData = await openChargeMapService.fetchIndiaOverview(250);
        recordsReceived = ocmData.sourceRawCount;

        for (const stn of ocmData.stations) {
          try {
            const chargers = ocmData.chargersMap[stn.id] || [];
            const existing = dbStore.getStations().find(
              (s) => s.externalId === stn.externalId || (Math.hypot(s.latitude - stn.latitude, s.longitude - stn.longitude) < 0.002)
            );

            if (existing) {
              // Update without overwriting verified fields
              dbStore.updateStation(existing.id, {
                operator: stn.operator,
                sourceLastUpdated: stn.sourceLastUpdated,
                localLastUpdated: new Date().toISOString(),
              });
              recordsUpdated++;
            } else {
              dbStore.createStation(stn, chargers);
              recordsCreated++;
            }
          } catch {
            recordsFailed++;
          }
        }
      } else if (source === "BEE") {
        const beeData = await beeService.fetchStations();
        recordsReceived = beeData.sourceRawCount;

        for (const stn of beeData.stations) {
          try {
            const chargers = beeData.chargersMap[stn.id] || [];
            const existing = dbStore.getStations().find(
              (s) => s.externalId === stn.externalId || (Math.hypot(s.latitude - stn.latitude, s.longitude - stn.longitude) < 0.002)
            );

            if (existing) {
              dbStore.updateStation(existing.id, {
                operator: stn.operator,
                localLastUpdated: new Date().toISOString(),
              });
              recordsUpdated++;
            } else {
              dbStore.createStation(stn, chargers);
              recordsCreated++;
            }
          } catch {
            recordsFailed++;
          }
        }
      } else if (source === "OCPI") {
        const ocpiData = await ocpiProvider.getLocations();
        recordsReceived = ocpiData.locations.length;
        const normalized = ocpiProvider.normalizeLocations(ocpiData.locations);

        for (const stn of normalized.stations) {
          try {
            const chargers = normalized.chargersMap[stn.id] || [];
            const existing = dbStore.getStations().find(
              (s) => s.externalId === stn.externalId || (Math.hypot(s.latitude - stn.latitude, s.longitude - stn.longitude) < 0.002)
            );

            if (existing) {
              dbStore.updateStation(existing.id, {
                sourceLastUpdated: stn.sourceLastUpdated,
                localLastUpdated: new Date().toISOString(),
              });
              recordsUpdated++;
            } else {
              dbStore.createStation(stn, chargers);
              recordsCreated++;
            }
          } catch {
            recordsFailed++;
          }
        }
      }
    } catch (err) {
      errorMessage = (err as Error).message;
      recordsFailed++;
    }

    const completedAt = new Date().toISOString();
    const status = recordsFailed === 0 ? "SUCCESS" : recordsCreated > 0 ? "PARTIAL_SUCCESS" : "FAILED";

    const log = dbStore.addSyncLog({
      source,
      startedAt,
      completedAt,
      recordsReceived,
      recordsCreated,
      recordsUpdated,
      recordsFailed,
      status,
      errorMessage,
    });

    return {
      source,
      recordsReceived,
      recordsCreated,
      recordsUpdated,
      recordsFailed,
      status,
      log,
    };
  }

  async syncAllSources(): Promise<SyncResult[]> {
    const results: SyncResult[] = [];
    results.push(await this.syncSource("OPEN_CHARGE_MAP"));
    results.push(await this.syncSource("BEE"));
    results.push(await this.syncSource("OCPI"));
    return results;
  }
}

export const stationSyncService = new StationSyncService();
