import {
  pgTable,
  text,
  timestamp,
  integer,
  doublePrecision,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("DRIVER"), // 'DRIVER' | 'ADMIN'
    phone: text("phone"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("users_email_idx").on(table.email),
  ]
);

export const driverProfiles = pgTable(
  "driver_profiles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    preferredChargerType: text("preferred_charger_type").default("CCS2"),
    preferredChargingSpeed: text("preferred_charging_speed").default("FAST"),
    preferredPriceRange: text("preferred_price_range").default("ANY"),
    notificationPreferences: text("notification_preferences").default("{}"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("driver_profiles_user_idx").on(table.userId),
  ]
);

export const vehicles = pgTable(
  "vehicles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    make: text("make").notNull(),
    model: text("model").notNull(),
    year: integer("year").notNull(),
    batteryCapacityKwh: doublePrecision("battery_capacity_kwh").notNull(),
    connectorType: text("connector_type").notNull().default("CCS2"),
    apiSupported: boolean("api_supported").default(true),
    obdSupported: boolean("obd_supported").default(true),
    connectionMode: text("connection_mode").notNull().default("SIMULATION"), // 'OEM_API' | 'OBD_DEVICE' | 'MANUAL' | 'SIMULATION'
    currentBatteryPercentage: doublePrecision("current_battery_percentage").notNull().default(50),
    estimatedRangeKm: doublePrecision("estimated_range_km").notNull().default(200),
    currentLatitude: doublePrecision("current_latitude").notNull().default(13.0827),
    currentLongitude: doublePrecision("current_longitude").notNull().default(80.2707),
    chargingStatus: text("charging_status").notNull().default("IDLE"),
    lastSyncedAt: timestamp("last_synced_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("vehicles_user_idx").on(table.userId),
  ]
);

export const vehicleTelemetry = pgTable(
  "vehicle_telemetry",
  {
    id: text("id").primaryKey(),
    vehicleId: text("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
    batteryPercentage: doublePrecision("battery_percentage").notNull(),
    estimatedRangeKm: doublePrecision("estimated_range_km").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    chargingStatus: text("charging_status").notNull(),
    chargingPowerKw: doublePrecision("charging_power_kw").notNull().default(0),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
    source: text("source").notNull().default("SIMULATION"),
  },
  (table) => [
    index("telemetry_vehicle_time_idx").on(table.vehicleId, table.timestamp),
  ]
);

export const chargingStations = pgTable(
  "charging_stations",
  {
    id: text("id").primaryKey(),
    externalId: text("external_id").notNull(),
    name: text("name").notNull(),
    operator: text("operator").notNull(),
    address: text("address").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull(),
    country: text("country").notNull().default("India"),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    openingHours: text("opening_hours").default("24/7"),
    source: text("source").notNull().default("LOCAL"), // 'OPEN_CHARGE_MAP' | 'BEE' | 'OCPI' | 'LOCAL'
    sourceId: text("source_id"),
    sourceLastUpdated: timestamp("source_last_updated"),
    localLastUpdated: timestamp("local_last_updated").defaultNow().notNull(),
    verificationStatus: text("verification_status").notNull().default("VERIFIED"), // 'VERIFIED' | 'PENDING' | 'FLAGGED'
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("stations_geo_idx").on(table.latitude, table.longitude),
    index("stations_city_idx").on(table.city),
    index("stations_operator_idx").on(table.operator),
    uniqueIndex("stations_external_source_idx").on(table.externalId, table.source),
  ]
);

export const chargers = pgTable(
  "chargers",
  {
    id: text("id").primaryKey(),
    stationId: text("station_id").notNull().references(() => chargingStations.id, { onDelete: "cascade" }),
    evseId: text("evse_id").notNull(),
    connectorType: text("connector_type").notNull(),
    powerKw: doublePrecision("power_kw").notNull(),
    chargingType: text("charging_type").notNull().default("DC_FAST"),
    status: text("status").notNull().default("AVAILABLE"), // 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'FAULTED' | 'OFFLINE' | 'UNKNOWN'
    currentSessionId: text("current_session_id"),
    lastStatusUpdate: timestamp("last_status_update").defaultNow().notNull(),
  },
  (table) => [
    index("chargers_station_idx").on(table.stationId),
    index("chargers_status_idx").on(table.status),
  ]
);

export const chargingSessions = pgTable(
  "charging_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    vehicleId: text("vehicle_id").notNull().references(() => vehicles.id),
    stationId: text("station_id").notNull().references(() => chargingStations.id),
    chargerId: text("charger_id").notNull().references(() => chargers.id),
    startTime: timestamp("start_time").defaultNow().notNull(),
    endTime: timestamp("end_time"),
    startingBattery: doublePrecision("starting_battery").notNull(),
    endingBattery: doublePrecision("ending_battery"),
    energyConsumedKwh: doublePrecision("energy_consumed_kwh").default(0).notNull(),
    chargingPowerKw: doublePrecision("charging_power_kw").notNull(),
    estimatedCost: doublePrecision("estimated_cost").notNull(),
    actualCost: doublePrecision("actual_cost"),
    status: text("status").notNull().default("IN_PROGRESS"), // 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  },
  (table) => [
    index("sessions_user_idx").on(table.userId),
    index("sessions_station_idx").on(table.stationId),
  ]
);

export const reservations = pgTable(
  "reservations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    vehicleId: text("vehicle_id").notNull().references(() => vehicles.id),
    stationId: text("station_id").notNull().references(() => chargingStations.id),
    chargerId: text("charger_id").notNull().references(() => chargers.id),
    reservationStart: timestamp("reservation_start").notNull(),
    reservationEnd: timestamp("reservation_end").notNull(),
    status: text("status").notNull().default("CONFIRMED"), // 'PENDING' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED' | 'NO_SHOW'
    estimatedCost: doublePrecision("estimated_cost").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("reservations_station_time_idx").on(table.stationId, table.reservationStart),
    index("reservations_user_idx").on(table.userId),
  ]
);

export const queueEntries = pgTable(
  "queue_entries",
  {
    id: text("id").primaryKey(),
    stationId: text("station_id").notNull().references(() => chargingStations.id, { onDelete: "cascade" }),
    chargerId: text("charger_id").references(() => chargers.id),
    vehicleId: text("vehicle_id").notNull().references(() => vehicles.id),
    userId: text("user_id").notNull().references(() => users.id),
    position: integer("position").notNull(),
    estimatedWaitMinutes: integer("estimated_wait_minutes").notNull().default(0),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
    status: text("status").notNull().default("WAITING"), // 'WAITING' | 'CALLED' | 'CHARGING' | 'ABANDONED'
  },
  (table) => [
    index("queue_station_idx").on(table.stationId),
  ]
);

export const stationPrices = pgTable(
  "station_prices",
  {
    id: text("id").primaryKey(),
    stationId: text("station_id").notNull().references(() => chargingStations.id, { onDelete: "cascade" }),
    chargerId: text("charger_id").references(() => chargers.id),
    pricingType: text("pricing_type").notNull().default("PER_KWH"),
    pricePerKwh: doublePrecision("price_per_kwh").notNull(),
    sessionFee: doublePrecision("session_fee").notNull().default(0),
    parkingFee: doublePrecision("parking_fee").notNull().default(0),
    currency: text("currency").notNull().default("INR"),
    effectiveFrom: timestamp("effective_from").defaultNow().notNull(),
    effectiveUntil: timestamp("effective_until"),
  },
  (table) => [
    index("prices_station_idx").on(table.stationId),
  ]
);

export const stationDemand = pgTable(
  "station_demand",
  {
    id: text("id").primaryKey(),
    stationId: text("station_id").notNull().references(() => chargingStations.id, { onDelete: "cascade" }),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
    activeSessions: integer("active_sessions").notNull().default(0),
    availableChargers: integer("available_chargers").notNull().default(0),
    occupiedChargers: integer("occupied_chargers").notNull().default(0),
    queueLength: integer("queue_length").notNull().default(0),
    utilizationPercentage: doublePrecision("utilization_percentage").notNull().default(0),
  },
  (table) => [
    index("demand_station_time_idx").on(table.stationId, table.timestamp),
  ]
);

export const faultReports = pgTable(
  "fault_reports",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    stationId: text("station_id").notNull().references(() => chargingStations.id),
    chargerId: text("charger_id").references(() => chargers.id),
    category: text("category").notNull(),
    description: text("description").notNull(),
    severity: text("severity").notNull().default("MEDIUM"), // 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    status: text("status").notNull().default("PENDING"), // 'PENDING' | 'INVESTIGATING' | 'RESOLVED'
    createdAt: timestamp("created_at").defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at"),
  },
  (table) => [
    index("faults_station_idx").on(table.stationId),
    index("faults_status_idx").on(table.status),
  ]
);

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    message: text("message").notNull(),
    type: text("type").notNull().default("RECOMMENDATION"),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("notifications_user_idx").on(table.userId),
  ]
);

export const stationSyncLogs = pgTable(
  "station_sync_logs",
  {
    id: text("id").primaryKey(),
    source: text("source").notNull(),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at").defaultNow().notNull(),
    recordsReceived: integer("records_received").notNull().default(0),
    recordsCreated: integer("records_created").notNull().default(0),
    recordsUpdated: integer("records_updated").notNull().default(0),
    recordsFailed: integer("records_failed").notNull().default(0),
    status: text("status").notNull().default("SUCCESS"),
    errorMessage: text("error_message"),
  }
);

export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    reservationId: text("reservation_id").references(() => reservations.id),
    sessionId: text("session_id").references(() => chargingSessions.id),
    amount: doublePrecision("amount").notNull(),
    currency: text("currency").notNull().default("INR"),
    status: text("status").notNull().default("SUCCESS"),
    provider: text("provider").notNull().default("DEMO"),
    mode: text("mode").notNull().default("DEMO"), // 'DEMO' | 'REAL'
    createdAt: timestamp("created_at").defaultNow().notNull(),
  }
);
