"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Zap,
  MapPin,
  Route,
  Car,
  CalendarCheck,
  History,
  Bell,
  LogOut,
  Menu,
  X,
  Radio,
  Sliders,
} from "lucide-react";
import { ConnectionMode, User } from "@/types";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>("SIMULATION");
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {});

    fetch("/api/vehicle")
      .then((res) => res.json())
      .then((data) => {
        if (data.vehicle) {
          setConnectionMode(data.vehicle.connectionMode);
        }
      })
      .catch(() => {});

    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data) => {
        if (data.notifications) {
          setUnreadNotifs(data.notifications.filter((n: { read: boolean }) => !n.read).length);
        }
      })
      .catch(() => {});
  }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
  };

  const navLinks = [
    { name: "Dashboard", href: "/dashboard", icon: Zap },
    { name: "Map", href: "/map", icon: MapPin },
    { name: "Plan Trip", href: "/plan-trip", icon: Route },
    { name: "My Vehicle", href: "/vehicle", icon: Car },
    { name: "Reservations", href: "/reservations", icon: CalendarCheck },
    { name: "History", href: "/history", icon: History },
  ];

  // Semantic connection badge per automotive design standard
  const renderConnectionBadge = () => {
    switch (connectionMode) {
      case "OEM_API":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--bg-elevated)] text-[var(--primary-accent)] border border-[var(--border-subtle)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary-accent)] animate-pulse"></span>
            LIVE API
          </span>
        );
      case "OBD_DEVICE":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--bg-elevated)] text-[var(--info)] border border-[var(--border-subtle)]">
            <Radio className="h-2.5 w-2.5" />
            OBD
          </span>
        );
      case "MANUAL":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--bg-elevated)] text-[var(--warning)] border border-[var(--border-subtle)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--warning)]"></span>
            MANUAL
          </span>
        );
      case "SIMULATION":
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
            <Sliders className="h-2.5 w-2.5 text-[var(--primary-accent)]" />
            SIMULATION
          </span>
        );
    }
  };

  return (
    <nav className="sticky top-0 z-40 w-full bg-[var(--bg-primary)]/95 backdrop-blur-md border-b border-[var(--border-subtle)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--primary-accent)] shadow-sm group-hover:border-[var(--primary-accent)] transition-colors">
                <Zap className="w-4 h-4 fill-current" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight text-[var(--text-primary)]">
                  VoltWise<span className="text-[var(--primary-accent)]">.AI</span>
                </span>
                <span className="text-[9px] text-[var(--text-muted)] tracking-wider uppercase font-medium">
                  Intelligent EV Mobility
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-xs"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]/60"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="hidden md:flex items-center gap-3">
            {renderConnectionBadge()}

            {/* Notifications */}
            <Link
              href="/notifications"
              className="relative p-2 rounded-lg bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors shadow-xs"
              title="Notifications"
            >
              <Bell className="w-3.5 h-3.5" />
              {unreadNotifs > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--danger)]"></span>
              )}
            </Link>

            {/* Driver Profile / Auth Action */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-[var(--border-subtle)]">
                <div className="text-right">
                  <div className="text-xs font-medium text-[var(--text-primary)] leading-tight">{user.name}</div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{user.role}</div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold btn-primary shadow-xs"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/notifications"
              className="relative p-2 rounded-lg bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifs > 0 && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[var(--danger)]"></span>
              )}
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer (Driver Links Only) */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] px-4 pt-2 pb-4 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium ${
                  isActive ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold" : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.name}
              </Link>
            );
          })}
          <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-col gap-2">
            {user ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[var(--danger)] text-left cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out ({user.name})
              </button>
            ) : (
              <Link
                href="/login"
                className="w-full text-center py-2 rounded-lg text-xs font-semibold btn-primary"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
