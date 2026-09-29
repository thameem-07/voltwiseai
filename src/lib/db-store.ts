import {
  User,
  Vehicle,
  VehicleTelemetry,
  ChargingStation,
  Charger,
  StationPrice,
  QueueEntry,
  StationDemand,
  Reservation,
  ChargingSession,
  FaultReport,
  Notification,
  StationSyncLog,
  Payment,
} from "../types";
import {
  initialUsers,
  initialVehicles,
  initialStations,
  initialChargers,
  initialPrices,
  initialQueues,
  initialDemands,
  initialReservations,
  initialFaultReports,
  initialNotifications,
  initialSyncLogs,
} from "./seed-data";

// Global in-memory reactive store with persistence across serverless invocations within container
declare global {
  var __voltwise_store__: {
    users: User[];
    vehicles: Vehicle[];
    telemetry: VehicleTelemetry[];
    stations: ChargingStation[];
    chargers: Charger[];
    prices: StationPrice[];
    queues: QueueEntry[];
    demands: StationDemand[];
    reservations: Reservation[];
    sessions: ChargingSession[];
    faultReports: FaultReport[];
    notifications: Notification[];
    syncLogs: StationSyncLog[];
    payments: Payment[];
  } | undefined;
}

function initializeStore() {
  if (!globalThis.__voltwise_store__) {
    globalThis.__voltwise_store__ = {
      users: [...initialUsers],
      vehicles: [...initialVehicles],
      telemetry: [],
      stations: [...initialStations],
      chargers: [...initialChargers],
      prices: [...initialPrices],
      queues: [...initialQueues],
      demands: [...initialDemands],
      reservations: [...initialReservations],
      sessions: [
        {
          id: "sess_01",
          userId: "usr_driver_01",
          vehicleId: "veh_nexon_01",
          stationId: "stn_zeon_ea",
          chargerId: "chg_ea_01",
          startTime: new Date(Date.now() - 86400000).toISOString(),
          endTime: new Date(Date.now() - 84000000).toISOString(),
          startingBattery: 18,
          endingBattery: 85,
          energyConsumedKwh: 27.2,
          chargingPowerKw: 120,
          estimatedCost: 523,
          actualCost: 523,
          status: "COMPLETED",
        },
      ],
      faultReports: [...initialFaultReports],
      notifications: [...initialNotifications],
      syncLogs: [...initialSyncLogs],
      payments: [
        {
          id: "pay_01",
          userId: "usr_driver_01",
          reservationId: "res_01",
          amount: 380,
          currency: "INR",
          status: "SUCCESS",
          provider: "DEMO",
          mode: "DEMO",
          createdAt: new Date().toISOString(),
        },
      ],
    };
  }
  return globalThis.__voltwise_store__;
}

export const dbStore = {
  getStore() {
    return initializeStore();
  },

  resetToSeed() {
    globalThis.__voltwise_store__ = undefined;
    return initializeStore();
  },

  // USERS
  getUsers(): User[] {
    return this.getStore().users;
  },

  getUserById(id: string): User | undefined {
    return this.getStore().users.find((u) => u.id === id);
  },

  getUserByEmail(email: string): User | undefined {
    return this.getStore().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  },

  createUser(userData: Omit<User, "id" | "createdAt" | "updatedAt">): User {
    const store = this.getStore();
    const newUser: User = {
      ...userData,
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.users.push(newUser);
    return newUser;
  },

  // VEHICLES
  getVehicles(userId?: string): Vehicle[] {
    const store = this.getStore();
    if (userId) {
      return store.vehicles.filter((v) => v.userId === userId);
    }
    return store.vehicles;
  },

  getVehicleById(id: string): Vehicle | undefined {
    return this.getStore().vehicles.find((v) => v.id === id);
  },

  updateVehicle(id: string, updates: Partial<Vehicle>): Vehicle | null {
    const store = this.getStore();
    const index = store.vehicles.findIndex((v) => v.id === id);
    if (index === -1) return null;

    const updated = {
      ...store.vehicles[index],
      ...updates,
      updatedAt: new Date().toISOString(),
      lastSyncedAt: new Date().toISOString(),
    };
    store.vehicles[index] = updated;

    // Record telemetry snapshot
    if (
      updates.currentBatteryPercentage !== undefined ||
      updates.currentLatitude !== undefined ||
      updates.currentLongitude !== undefined
    ) {
      this.addTelemetry({
        vehicleId: id,
        batteryPercentage: updated.currentBatteryPercentage,
        estimatedRangeKm: updated.estimatedRangeKm,
        latitude: updated.currentLatitude,
        longitude: updated.currentLongitude,
        chargingStatus: updated.chargingStatus,
        chargingPowerKw: updated.chargingStatus === "CHARGING" ? 60 : 0,
        source: updated.connectionMode,
      });
    }

    return updated;
  },

  createVehicle(vehicleData: Omit<Vehicle, "id" | "createdAt" | "updatedAt" | "lastSyncedAt">): Vehicle {
    const store = this.getStore();
    const newVehicle: Vehicle = {
      ...vehicleData,
      id: `veh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      lastSyncedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.vehicles.push(newVehicle);
    return newVehicle;
  },

  // TELEMETRY
  getTelemetry(vehicleId: string, limit = 50): VehicleTelemetry[] {
    return this.getStore().telemetry
      .filter((t) => t.vehicleId === vehicleId)
      .slice(-limit);
  },

  addTelemetry(telemetryData: Omit<VehicleTelemetry, "id" | "timestamp">): VehicleTelemetry {
    const store = this.getStore();
    const item: VehicleTelemetry = {
      ...telemetryData,
      id: `tel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    store.telemetry.push(item);
    if (store.telemetry.length > 500) {
      store.telemetry = store.telemetry.slice(-300);
    }
    return item;
  },

  // STATIONS
  getStations(): ChargingStation[] {
    return this.getStore().stations;
  },

  getStationById(id: string): ChargingStation | undefined {
    return this.getStore().stations.find((s) => s.id === id);
  },

  updateStation(id: string, updates: Partial<ChargingStation>): ChargingStation | null {
    const store = this.getStore();
    const idx = store.stations.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    store.stations[idx] = {
      ...store.stations[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
      localLastUpdated: new Date().toISOString(),
    };
    return store.stations[idx];
  },

  createStation(stationData: Omit<ChargingStation, "id" | "createdAt" | "updatedAt" | "localLastUpdated">, chargersData?: Omit<Charger, "id" | "stationId">[]): ChargingStation {
    const store = this.getStore();
    const newStation: ChargingStation = {
      ...stationData,
      id: `stn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      localLastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.stations.push(newStation);

    if (chargersData && chargersData.length > 0) {
      chargersData.forEach((chg, i) => {
        store.chargers.push({
          ...chg,
          id: `chg_${newStation.id}_${i + 1}`,
          stationId: newStation.id,
          lastStatusUpdate: new Date().toISOString(),
        });
      });
    }

    // Default price
    store.prices.push({
      id: `prc_${newStation.id}`,
      stationId: newStation.id,
      pricingType: "PER_KWH",
      pricePerKwh: 18.0,
      sessionFee: 15,
      parkingFee: 0,
      currency: "INR",
      effectiveFrom: new Date().toISOString(),
    });

    return newStation;
  },

  // CHARGERS
  getChargers(stationId?: string): Charger[] {
    const store = this.getStore();
    if (stationId) {
      return store.chargers.filter((c) => c.stationId === stationId);
    }
    return store.chargers;
  },

  updateChargerStatus(chargerId: string, status: Charger["status"]): Charger | null {
    const store = this.getStore();
    const chg = store.chargers.find((c) => c.id === chargerId);
    if (!chg) return null;
    chg.status = status;
    chg.lastStatusUpdate = new Date().toISOString();
    return chg;
  },

  // PRICES
  getPrices(stationId?: string): StationPrice[] {
    const store = this.getStore();
    if (stationId) {
      return store.prices.filter((p) => p.stationId === stationId);
    }
    return store.prices;
  },

  // QUEUES
  getQueues(stationId?: string): QueueEntry[] {
    const store = this.getStore();
    if (stationId) {
      return store.queues.filter((q) => q.stationId === stationId && q.status === "WAITING");
    }
    return store.queues;
  },

  setStationQueueCount(stationId: string, count: number, waitMinutes: number) {
    const store = this.getStore();
    store.queues = store.queues.filter((q) => q.stationId !== stationId);
    for (let i = 1; i <= count; i++) {
      store.queues.push({
        id: `q_${stationId}_${i}`,
        stationId,
        vehicleId: `sim_veh_${i}`,
        userId: `sim_user_${i}`,
        position: i,
        estimatedWaitMinutes: Math.round((waitMinutes / count) * i),
        joinedAt: new Date(Date.now() - i * 180000).toISOString(),
        status: "WAITING",
      });
    }
  },

  // DEMANDS
  getDemands(stationId?: string): StationDemand[] {
    const store = this.getStore();
    if (stationId) {
      return store.demands.filter((d) => d.stationId === stationId);
    }
    return store.demands;
  },

  // RESERVATIONS
  getReservations(userId?: string): Reservation[] {
    const store = this.getStore();
    if (userId) {
      return store.reservations.filter((r) => r.userId === userId);
    }
    return store.reservations;
  },

  createReservation(resData: Omit<Reservation, "id" | "createdAt">): Reservation {
    const store = this.getStore();
    const newReservation: Reservation = {
      ...resData,
      id: `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    store.reservations.push(newReservation);

    // Mark charger as RESERVED
    const charger = store.chargers.find((c) => c.id === resData.chargerId);
    if (charger) {
      charger.status = "RESERVED";
      charger.lastStatusUpdate = new Date().toISOString();
    }

    // Add confirmation notification
    this.createNotification({
      userId: resData.userId,
      title: "Reservation Confirmed",
      message: `Your charging slot has been reserved. Valid until ${new Date(resData.reservationEnd).toLocaleTimeString()}.`,
      type: "RESERVATION",
    });

    return newReservation;
  },

  cancelReservation(id: string): boolean {
    const store = this.getStore();
    const res = store.reservations.find((r) => r.id === id);
    if (!res) return false;
    res.status = "CANCELLED";

    // Free up charger if reserved
    const charger = store.chargers.find((c) => c.id === res.chargerId);
    if (charger && charger.status === "RESERVED") {
      charger.status = "AVAILABLE";
      charger.lastStatusUpdate = new Date().toISOString();
    }
    return true;
  },

  // SESSIONS
  getSessions(userId?: string): ChargingSession[] {
    const store = this.getStore();
    if (userId) {
      return store.sessions.filter((s) => s.userId === userId);
    }
    return store.sessions;
  },

  // FAULTS
  getFaultReports(): FaultReport[] {
    return this.getStore().faultReports;
  },

  createFaultReport(reportData: Omit<FaultReport, "id" | "createdAt">): FaultReport {
    const store = this.getStore();
    const report: FaultReport = {
      ...reportData,
      id: `flt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    store.faultReports.push(report);

    // If critical or high, mark charger or station status
    if (reportData.chargerId && (reportData.severity === "CRITICAL" || reportData.severity === "HIGH")) {
      const charger = store.chargers.find((c) => c.id === reportData.chargerId);
      if (charger) {
        charger.status = "FAULTED";
        charger.lastStatusUpdate = new Date().toISOString();
      }
    }

    return report;
  },

  updateFaultReport(id: string, updates: Partial<FaultReport>): FaultReport | null {
    const store = this.getStore();
    const report = store.faultReports.find((r) => r.id === id);
    if (!report) return null;
    Object.assign(report, updates);
    if (updates.status === "RESOLVED") {
      report.resolvedAt = new Date().toISOString();
      if (report.chargerId) {
        const charger = store.chargers.find((c) => c.id === report.chargerId);
        if (charger && charger.status === "FAULTED") {
          charger.status = "AVAILABLE";
        }
      }
    }
    return report;
  },

  // NOTIFICATIONS
  getNotifications(userId: string): Notification[] {
    return this.getStore().notifications.filter((n) => n.userId === userId);
  },

  createNotification(notifData: Omit<Notification, "id" | "createdAt" | "read">): Notification {
    const store = this.getStore();
    const notif: Notification = {
      ...notifData,
      id: `ntf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    store.notifications.unshift(notif);
    return notif;
  },

  markNotificationRead(id: string): boolean {
    const store = this.getStore();
    const notif = store.notifications.find((n) => n.id === id);
    if (!notif) return false;
    notif.read = true;
    return true;
  },

  // SYNC LOGS
  getSyncLogs(): StationSyncLog[] {
    return this.getStore().syncLogs;
  },

  addSyncLog(logData: Omit<StationSyncLog, "id">): StationSyncLog {
    const store = this.getStore();
    const log: StationSyncLog = {
      ...logData,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
    store.syncLogs.unshift(log);
    return log;
  },

  // PAYMENTS
  createPayment(payData: Omit<Payment, "id" | "createdAt">): Payment {
    const store = this.getStore();
    const payment: Payment = {
      ...payData,
      id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    store.payments.push(payment);
    return payment;
  },

  getPayments(userId?: string): Payment[] {
    const store = this.getStore();
    if (userId) return store.payments.filter((p) => p.userId === userId);
    return store.payments;
  },
};
