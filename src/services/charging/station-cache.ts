import { ChargingStation, Charger } from "@/types";

interface CacheEntry {
  stations: ChargingStation[];
  chargersMap: Record<string, Charger[]>;
  timestamp: number;
}

class StationCacheManager {
  private cache = new Map<string, CacheEntry>();
  private defaultTtlMs = 1000 * 60 * 30; // 30 minutes

  get(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.defaultTtlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry;
  }

  set(key: string, data: { stations: ChargingStation[]; chargersMap: Record<string, Charger[]> }, ttlMs?: number): void {
    // Keep cache bounded
    if (this.cache.size > 200) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      ...data,
      timestamp: Date.now() - (ttlMs ? (this.defaultTtlMs - ttlMs) : 0),
    });
  }

  getBboxKey(minLat: number, minLng: number, maxLat: number, maxLng: number): string {
    // Bucket coordinates to ~10km grid (0.1 degree) so slight pans reuse cache
    const bMinLat = (Math.floor(minLat * 10) / 10).toFixed(1);
    const bMinLng = (Math.floor(minLng * 10) / 10).toFixed(1);
    const bMaxLat = (Math.ceil(maxLat * 10) / 10).toFixed(1);
    const bMaxLng = (Math.ceil(maxLng * 10) / 10).toFixed(1);
    return `bbox_${bMinLat}_${bMinLng}_${bMaxLat}_${bMaxLng}`;
  }

  getCenterRadiusKey(lat: number, lng: number, distanceKm: number): string {
    const bLat = (Math.round(lat * 10) / 10).toFixed(1);
    const bLng = (Math.round(lng * 10) / 10).toFixed(1);
    const bDist = Math.round(distanceKm / 10) * 10;
    return `radius_${bLat}_${bLng}_${bDist}km`;
  }

  clear(): void {
    this.cache.clear();
  }
}

export const stationCache = new StationCacheManager();
