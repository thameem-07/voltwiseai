import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VoltWise AI — Intelligent EV Charging & Infrastructure Platform",
  description:
    "Intelligent EV charging decisions powered by vehicle telemetry, charging infrastructure data and predictive intelligence. Charge Smarter. Wait Less.",
  keywords: [
    "VoltWise",
    "EV charging",
    "electric vehicle",
    "charging bottleneck",
    "OCPI",
    "Open Charge Map",
    "telemetry",
    "predictive queue",
    "EV infrastructure",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
        {children}
      </body>
    </html>
  );
}
