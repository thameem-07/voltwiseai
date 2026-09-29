export type UserRole = "DRIVER" | "ADMIN";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DriverProfile {
  id: string;
  userId: string;
  preferredChargerType: string;
  preferredChargingSpeed: "SLOW" | "FAST" | "ULTRA_FAST";
  preferredPriceRange: string;
  notificationPreferences: {
    batteryAlerts: boolean;
    congestionAlerts: boolean;
    reservationUpdates: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export type ConnectionMode = "OEM_API" | "OBD_DEVICE" | "MANUAL" | "SIMULATION";
export type ChargingStatus = "IDLE" | "CHARGING" | "WAITING_IN_QUEUE" | "DISCONNECTED";

export interface Vehicle {
  id: string;
  userId: string;
  make: string;
  model: string;
  year: number;
  batteryCapacityKwh: number;
  connectorType: "CCS2" | "Type 2" | "GB/T" | "Bharat AC-001" | "CHAdeMO";
  apiSupported: boolean;
  obdSupported: boolean;
  connectionMode: ConnectionMode;
  currentBatteryPercentage: number;
  estimatedRangeKm: number;
  currentLatitude: number;
  currentLongitude: number;
  chargingStatus: ChargingStatus;
  lastSyncedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleTelemetry {
  id: string;
  vehicleId: string;
  batteryPercentage: number;
  estimatedRangeKm: number;
  latitude: number;
  longitude: number;
  chargingStatus: ChargingStatus;
  chargingPowerKw: number;
  timestamp: string;
  source: ConnectionMode;
}

export type StationSource = "OPEN_CHARGE_MAP" | "BEE" | "OCPI" | "LOCAL";
export type VerificationStatus = "VERIFIED" | "PENDING" | "FLAGGED";

export interface ChargingStation {
  id: string;
  externalId: string;
  name: string;
  operator: string;
  address: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  openingHours: string;
  source: StationSource;
  sourceId?: string;
  sourceLastUpdated?: string;
  localLastUpdated: string;
  verificationStatus: VerificationStatus;
  syncStatus?: "LIVE" | "RECENTLY_SYNCED" | "STALE" | "DATA_UNAVAILABLE";
  hasLiveStatus?: boolean;
  statusMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export type ChargerStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "FAULTED" | "OFFLINE" | "UNKNOWN";
export type ChargingSpeedCategory = "AC_SLOW" | "DC_FAST" | "DC_ULTRA_FAST";

export interface Charger {
  id: string;
  stationId: string;
  evseId: string;
  connectorType: "CCS2" | "Type 2" | "GB/T" | "Bharat AC-001" | "CHAdeMO";
  powerKw: number;
  chargingType: ChargingSpeedCategory;
  status: ChargerStatus;
  currentSessionId?: string;
  lastStatusUpdate: string;
}

export interface StationPrice {
  id: string;
  stationId: string;
  chargerId?: string;
  pricingType: "PER_KWH" | "TIME_BASED" | "FLAT";
  pricePerKwh: number; // in INR ₹
  sessionFee: number;
  parkingFee: number;
  currency: string;
  effectiveFrom: string;
  effectiveUntil?: string;
}

export interface QueueEntry {
  id: string;
  stationId: string;
  chargerId?: string;
  vehicleId: string;
  userId: string;
  position: number;
  estimatedWaitMinutes: number;
  joinedAt: string;
  status: "WAITING" | "CALLED" | "CHARGING" | "ABANDONED";
}

export interface StationDemand {
  id: string;
  stationId: string;
  timestamp: string;
  activeSessions: number;
  availableChargers: number;
  occupiedChargers: number;
  queueLength: number;
  utilizationPercentage: number;
}

export type ReservationStatus = "PENDING" | "CONFIRMED" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "EXPIRED" | "NO_SHOW";

export interface Reservation {
  id: string;
  userId: string;
  vehicleId: string;
  stationId: string;
  chargerId: string;
  reservationStart: string;
  reservationEnd: string;
  status: ReservationStatus;
  estimatedCost: number;
  createdAt: string;
}

export interface ChargingSession {
  id: string;
  userId: string;
  vehicleId: string;
  stationId: string;
  chargerId: string;
  startTime: string;
  endTime?: string;
  startingBattery: number;
  endingBattery?: number;
  energyConsumedKwh: number;
  chargingPowerKw: number;
  estimatedCost: number;
  actualCost?: number;
  status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
}

export interface FaultReport {
  id: string;
  userId: string;
  stationId: string;
  chargerId?: string;
  category: "CHARGER_NOT_WORKING" | "CONNECTOR_DAMAGED" | "CHARGING_TOO_SLOW" | "PAYMENT_ISSUE" | "STATION_INACCESSIBLE" | "OTHER";
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "PENDING" | "INVESTIGATING" | "RESOLVED";
  createdAt: string;
  resolvedAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "BATTERY_WARNING" | "RECOMMENDATION" | "RESERVATION" | "CHARGING_STATUS" | "CONGESTION_ALERT" | "FAULT_UPDATE";
  read: boolean;
  createdAt: string;
}

export interface StationSyncLog {
  id: string;
  source: StationSource;
  startedAt: string;
  completedAt: string;
  recordsReceived: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  status: "SUCCESS" | "PARTIAL_SUCCESS" | "FAILED";
  errorMessage?: string;
}

export interface Payment {
  id: string;
  userId: string;
  reservationId?: string;
  sessionId?: string;
  amount: number;
  currency: string;
  status: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
  provider: string;
  mode: "DEMO" | "REAL";
  createdAt: string;
}

// Intelligence & Recommendation Types
export interface StationRecommendation {
  station: ChargingStation;
  chargers: Charger[];
  price: StationPrice;
  distanceKm: number;
  estimatedTravelTimeMin: number;
  availableChargersCount: number;
  totalChargersCount: number;
  queueLength: number;
  estimatedWaitMinutes: number;
  bestChargerKw: number;
  estimatedChargingTimeMin: number;
  estimatedCostInr: number;
  score: number;
  reasons: string[];
  isRecommended: boolean;
  congestionLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  canSafelyReach: boolean;
  batteryArrivalPercent: number;
}

export interface RoutePlanResult {
  origin: { lat: number; lng: number; label: string };
  destination: { lat: number; lng: number; label: string };
  totalDistanceKm: number;
  estimatedDriveTimeMin: number;
  startingBattery: number;
  batteryRequiredKwh: number;
  directReachPossible: boolean;
  chargingRequired: boolean;
  unreachableJourney?: boolean;
  safetyReservePercent: number;
  statusMessage?: string;
  projectedBatteryAtDestination: number;
  chargingStopsNeeded: number;
  recommendedStops: {
    station: ChargingStation;
    arrivalBattery: number;
    targetBattery: number;
    chargeTimeMin: number;
    estimatedCost: number;
    chargerPowerKw: number;
    distanceAlongRouteKm?: number;
    detourKm?: number;
    reasons?: string[];
  }[];
  totalTripTimeMin: number;
  totalTripCostInr: number;
  geometry?: {
    type: "LineString";
    coordinates: [number, number][];
  };
}
