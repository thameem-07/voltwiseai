"use client";

import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/navbar";
import { DemoControlBar } from "@/components/demo-control-bar";
import {
  Bell,
  AlertTriangle,
  Zap,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Notification } from "@/types";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (data.notifications) setNotifications(data.notifications);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      loadNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col pb-24 transition-colors duration-200">
      <Navbar />
      <DemoControlBar onScenarioChange={loadNotifications} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
              <Bell className="w-7 h-7 text-[var(--primary-accent)]" />
              Notification Center
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
              Realtime battery alerts, reservation reminders, and regional congestion advisories.
            </p>
          </div>

          <button
            onClick={() => {
              notifications.forEach((n) => handleMarkAsRead(n.id));
            }}
            className="text-xs text-[var(--primary-accent)] hover:underline font-semibold cursor-pointer"
          >
            Mark all read
          </button>
        </div>

        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="card-level-2 p-12 text-center text-xs text-[var(--text-secondary)]">
              No active notifications. All systems operating normally.
            </div>
          ) : (
            notifications.map((n) => {
              const isBattery = n.type === "BATTERY_WARNING";
              const isCongestion = n.type === "CONGESTION_ALERT";

              return (
                <div
                  key={n.id}
                  className={`card-level-2 p-4 flex items-start justify-between gap-4 transition-all ${
                    !n.read
                      ? "border-[var(--primary-accent)]/50 shadow-sm"
                      : "opacity-80"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-xl mt-0.5 ${
                        isBattery
                          ? "bg-[var(--danger)]/15 text-[var(--danger)]"
                          : isCongestion
                          ? "bg-[var(--warning)]/15 text-[var(--warning)]"
                          : "bg-[var(--primary-accent)]/15 text-[var(--primary-accent)]"
                      }`}
                    >
                      {isBattery ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : isCongestion ? (
                        <Clock className="w-4 h-4" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-[var(--text-primary)]">{n.title}</h4>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-[var(--primary-accent)]"></span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">{n.message}</p>
                      <span className="text-[10px] text-[var(--text-muted)] mt-2 block font-mono">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {!n.read && (
                    <button
                      onClick={() => handleMarkAsRead(n.id)}
                      className="text-xs text-[var(--primary-accent)] hover:underline flex-shrink-0 cursor-pointer font-medium"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
