# VoltWise AI ⚡
> **Charge Smarter. Wait Less.**
>
> *Intelligent EV charging decisions powered by vehicle telemetry, charging infrastructure data and predictive intelligence.*

VoltWise AI is an enterprise-grade EV charging intelligence and route optimization platform, deployable directly on **GitHub + Vercel** with **Neon PostgreSQL**, **Drizzle ORM**, **MapLibre GL JS**, **OpenStreetMap**, **Nominatim**, and **OSRM**.

> [!NOTE]
> **Zero Google Maps Billing / No Prepayment Required:** VoltWise AI is powered by open mapping technology: **MapLibre GL JS** with high-resolution dark retina tiles, **Nominatim** geocoding behind our debounced server proxy (`/api/geocode`), and **OSRM** driving route engine (`/api/route`). No Google Maps credit card, billing, or prepayment is required!

---

## 1. Problem Statement & Mission
EV adoption is rapidly outpacing public charging infrastructure across major urban corridors. EV drivers face:
* **Unpredictable Queue Times:** Arriving at charging hubs only to encounter 30–45 minute queues.
* **The Nearest-Station Fallacy:** Legacy apps blindly route drivers to the physically closest station, causing localized congestion while higher-power hubs 3 km away sit underutilized.
* **Fragmented CPO Ecosystems:** Disjointed operator apps with no cross-network queue visibility or unified reservations.
* **Range Anxiety & Stranding Risk:** Complete disconnection between real-time vehicle State of Charge (SoC) and charger availability.
* **Urban Grid Bottlenecks:** Peak rush-hour overload on local distribution transformers.

### The Paradigm Shift
* **Legacy Apps Ask:** *"Where is a charging station?"*
* **VoltWise AI Answers:** *"Given my vehicle's battery SoC, consumption curve, live location, destination with intermediate waypoints, charger compatibility, real-time queue lengths, charging power, and electricity tariffs, what is the single best charging decision right now?"*

---

## 2. System Architecture

```text
    ┌──────────────────────┐         ┌────────────────────────┐
    │  Vehicle Telemetry   │         │ Multi-Protocol Ingestion│
    │  OEM API / OBD-II    │         │ OCM  •  OCPI  •  OSM   │
    └──────────┬───────────┘         └───────────┬────────────┘
               │                                 │
               ▼                                 ▼
    ┌─────────────────────────────────────────────────────────┐
    │               Unified Data Normalization                │
    │     Deduplication • Freshness Tracking • Geo-Indexing    │
    └──────────────────────────┬──────────────────────────────┘
                               │
                               ▼
    ┌─────────────────────────────────────────────────────────┐
    │              VoltWise AI Intelligence Layer             │
    │  • Multi-Factor Smart Recommendation Engine             │
    │  • Multi-Stop OSRM Driving Engine (/api/route)          │
    │  • Non-Linear Charging Physics & Battery Degradation    │
    │  • Queue & Congestion Predictive Modeler                │
    │  • Dynamic Utilization & Demand Heatmap Overlay         │
    │  • Nominatim Geocoding Proxy (/api/geocode)             │
    └──────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
    ┌──────────────────────┐       ┌──────────────────────┐
    │  Driver Application  │       │  Admin Operations    │
    │  (Navbar / Portal)   │       │  (/admin Protected)  │
    │  • Onboarding & OBD  │       │  • Network Heatmap   │
    │  • Telemetry Monitor │       │  • Data Sync Console │
    │  • MapLibre EV Map   │       │  • Incident Desk     │
    │  • Multi-Stop Trip   │       │  • EVSE Fleet Health │
    │  • OCPI Reservations │       │  • Role-Restricted   │
    └──────────────────────┘       └──────────────────────┘
```

---

## 3. Product Architecture & User Experiences

VoltWise AI maintains two strictly separated experiences:

### 1. Driver Application
Designed for daily EV drivers, commuters, and commercial fleet operators. Clean, distraction-free navigation:
* **Dashboard (`/dashboard`):** Real-time battery status, charging intelligence, recommended hub with transparent reasoning, today's corridor trip, and upcoming slot reservations.
* **Interactive Map (`/map`):** MapLibre GL JS with dark automotive styling, real station markers, connector filtering, reachable range radius, dynamic queue heatmap, and comprehensive station inspection panels.
* **Plan Trip (`/plan-trip`):** OpenStreetMap / Nominatim destination search, multi-stop intermediate waypoints (`+ Add Stop`), reordering, OSRM driving route navigation, battery consumption timeline, and automatic corridor fast-charger recommendations.
* **Vehicle Monitoring (`/vehicle`):** 24-hour battery discharge trend chart, OBD-II CAN bus diagnostics, lifetime charging efficiency, and connection source status.
* **Reservations (`/reservations`):** Discover charging hubs from the database, check real operator OCPI reservation support, select arrival windows, and prevent double bookings.
* **First-Time EV Onboarding (`/onboarding`):** Guided 3-step setup (OEM Vehicle API with secure OAuth explanation, OBD-II BLE dongle 5-step pairing, or manual vehicle entry).

### 2. Admin Operations Portal (`/admin`)
Restricted strictly to users with `role = "ADMIN"`. Normal drivers never see "Admin Portal" in navigation; unauthorized access is blocked server-side with a 403 Forbidden page. Features:
* **Network Overview:** Active EVSEs, peak demand, uptime, and daily energy throughput.
* **Real-Time Data Sync Console:** Detailed audit logs for Open Charge Map and OCPI operators (records fetched, added, updated, unchanged, and errors).
* **Grid Heatmap & Gap Analytics:** High-density EV corridor congestion mapping and fast-charger capacity deficit models.
* **Station & EVSE Fleet Management:** Charger operational statuses (`AVAILABLE`, `OCCUPIED`, `FAULTED`, `OFFLINE`).

---

## 4. EV Telemetry vs. EV Simulation System

VoltWise AI maintains a strict architectural distinction between real vehicle data and simulation:

| Mode | Source | Description |
| :--- | :--- | :--- |
| **LIVE OEM** | Cloud Vehicle APIs | Real manufacturer telemetry via secure OAuth token exchange. |
| **OBD-II** | ISO 15765-4 Dongle | 16-pin hardware diagnostic port CAN bus frames (voltage, current, cell variance). |
| **MANUAL** | User Input | Driver-specified battery capacity, connector type, and vehicle model. |
| **SIMULATION** | EV Simulation Panel | Clearly labeled testbed for vehicle SoC calibration and network congestion scenarios. |

### Manual EV Simulation Control Center
Accessible via the **EV Simulation** button on the Dashboard and telemetry control bar:
* **Battery SoC Slider:** 0% to 100% with automatic vehicle range re-calculation.
* **Location Picker:** Current GPS, device geolocation, OpenStreetMap place search, or Chennai landmark presets.
* **Destination Picker:** Any destination via debounced place search.
* **Charging Power:** 0 kW, 7 kW, 22 kW, 50 kW, 120 kW, 150 kW, or custom.
* **Network Scenario:** Low, Moderate, High, or Critical Congestion.
* *Note: Simulation updates vehicle telemetry and decision calculations only; it never fabricates fake charging stations.*

---

## 5. Technology Stack & Dark Design System

* **Framework:** Next.js (App Router), React 19, TypeScript
* **Styling:** Dark Mode Only design baseline using custom CSS custom properties:
  * **Background:** `#0E100F`
  * **Surface:** `#161917`
  * **Elevated Surface:** `#1D211E`
  * **Primary Lime:** `#C6FF3D`
  * **Secondary Green:** `#8FE388`
  * **Informational / Route Blue:** `#69B7FF`
  * **Warning Amber:** `#F2B84B`
  * **Critical Red:** `#EA5B5B`
* **Maps & Routing:** MapLibre GL JS, OpenStreetMap raster tiles, Nominatim Geocoding Proxy (`/api/geocode`), OSRM Driving Engine (`/api/route`)
* **Data Sources:** Open Charge Map (OCM) REST API, OCPI 2.3 Provider, BEE India EV Portal
* **Database & ORM:** Neon Serverless PostgreSQL with Drizzle ORM
* **Authentication:** Multi-method (Email + Password and Google Sign-In OAuth) with secure HTTP-only cookies

---

## 6. Getting Started

### Prerequisites
* Node.js 18+ (Tested on Node.js v24)
* npm 10+

### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/voltwise-ai.git
cd voltwise-ai

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
```

### Environment Variables
Configure `.env.local`:
```env
# Database (Neon Serverless Postgres)
DATABASE_URL=postgres://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require

# Authentication
AUTH_SECRET=voltwise_super_secret_jwt_key_2026_verifying_ev_system

# Google OAuth Sign-In (Optional - for user authentication only; NOT Google Maps)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Open Charge Map API (Server-side station discovery - optional)
OPENCHARGEMAP_API_KEY=

# OCPI Protocol (Optional operator integration)
OCPI_BASE_URL=
OCPI_TOKEN=
OCPI_VERSION=2.3.0
OCPI_SIMULATION=true

# Vehicle API
VEHICLE_API_SIMULATION=true
```

### Running Locally
```bash
# Start the development server
npm run dev

# Open http://localhost:3000
```

### Building for Production
```bash
# Type check and build optimized bundle
npm run build

# Start production server
npm run start
```

---

## 7. Demo Accounts & Credentials

| Role | Email | Password | Allowed Access |
| :--- | :--- | :--- | :--- |
| **Driver** | `driver@voltwise.ai` | `Driver@123` | `/dashboard`, `/map`, `/plan-trip`, `/vehicle`, `/reservations` |
| **Admin** | `admin@voltwise.ai` | `Admin@123` | `/admin` (Operations Console) + Driver views |

*Or use the **1-Click Quick Access** buttons on `/login` or test Google Sign-In.*

---

## 8. Platform Walkthrough Flow

1. **Sign Up:** Register at `/register` using Google Sign-In or email.
2. **Connect EV:** Experience `/onboarding` and select **OBD-II Device** to run the 5-step hardware pairing sequence.
3. **Open Dashboard:** Arrive at `/dashboard` displaying live vehicle telemetry and smart recommendation.
4. **Trigger Low Battery:** Open **EV Simulation**, adjust battery slider to **18%**, and apply. Notice the dashboard and recommendation engine immediately adapt.
5. **Plan Multi-Stop Trip:** Navigate to `/plan-trip`, search any destination via OpenStreetMap geocoding, click `+ Add Intermediate Stop`, and inspect the suggested charging waypoint with "Why this stop?" reasoning.
6. **Inspect MapLibre EV Map:** View `/map` to see real charging stations, toggle the dynamic congestion heatmap, and inspect station details.
7. **Verify Role Security:** Attempt to open `/admin` as a driver to confirm the server-enforced 403 Forbidden protection.

---

## 9. License
MIT License. VoltWise AI — Intelligent EV Charging Decisions.
