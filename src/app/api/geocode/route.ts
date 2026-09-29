import { NextRequest, NextResponse } from "next/server";

// In-memory cache for geocoding queries to respect free Nominatim rate limits (max 1 req/sec)
interface CacheEntry {
  data: Array<{
    id: string;
    label: string;
    displayName: string;
    lat: number;
    lng: number;
    type: string;
  }>;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

// Fallback landmark database for Chennai & Tamil Nadu EV corridors
const LOCAL_PRESETS = [
  { id: "pre_1", label: "T. Nagar, Central Chennai", displayName: "Thyagaraya Nagar, Chennai, Tamil Nadu, 600017, India", lat: 13.0418, lng: 80.2341, type: "commercial" },
  { id: "pre_2", label: "Kaveripattinam, Krishnagiri", displayName: "Kaveripattinam, Krishnagiri District, Tamil Nadu, 635112, India", lat: 12.4300, lng: 78.2200, type: "city" },
  { id: "pre_3", label: "Bengaluru City Central", displayName: "Bengaluru, Karnataka, 560001, India", lat: 12.9716, lng: 77.5946, type: "city" },
  { id: "pre_4", label: "Coimbatore City Central", displayName: "Coimbatore, Tamil Nadu, 641001, India", lat: 11.0168, lng: 76.9558, type: "city" },
  { id: "pre_5", label: "Pondicherry Beach Promenade", displayName: "White Town, Puducherry, 605001, India", lat: 11.9416, lng: 79.8083, type: "city" },
  { id: "pre_6", label: "Salem Junction & Bypass", displayName: "Salem, Tamil Nadu, 636005, India", lat: 11.6643, lng: 78.1460, type: "city" },
  { id: "pre_7", label: "Mumbai / Gateway of India", displayName: "Colaba, Mumbai, Maharashtra, 400001, India", lat: 18.9220, lng: 72.8347, type: "city" },
  { id: "pre_8", label: "Pune City Central", displayName: "Shivajinagar, Pune, Maharashtra, 411005, India", lat: 18.5204, lng: 73.8567, type: "city" },
  { id: "pre_9", label: "Phoenix Marketcity, Velachery", displayName: "Phoenix Marketcity, Velachery Main Road, Chennai, Tamil Nadu, 600042, India", lat: 12.9915, lng: 80.2173, type: "mall" },
  { id: "pre_10", label: "Chennai International Airport (MAA)", displayName: "Chennai International Airport, Meenambakkam, Chennai, Tamil Nadu, 600027, India", lat: 12.9856, lng: 80.1638, type: "aeroway" },
  { id: "pre_11", label: "Marina Beach, Triplicane", displayName: "Marina Beach Road, Triplicane, Chennai, Tamil Nadu, 600005, India", lat: 13.0534, lng: 80.2833, type: "natural" },
  { id: "pre_12", label: "SRM University, Kattankulathur", displayName: "SRM Institute of Science and Technology, GST Road, Kattankulathur, Tamil Nadu, 603203, India", lat: 12.8231, lng: 80.0442, type: "university" },
  { id: "pre_13", label: "OMR IT Corridor (Sholinganallur)", displayName: "Old Mahabalipuram Road, Sholinganallur, Chennai, Tamil Nadu, 600119, India", lat: 12.9010, lng: 80.2279, type: "highway" },
  { id: "pre_14", label: "Tambaram Railway Hub", displayName: "Tambaram Railway Station, GST Road, Tambaram, Chennai, Tamil Nadu, 600045, India", lat: 12.9249, lng: 80.1000, type: "station" },
  { id: "pre_15", label: "Mahabalipuram Shore Temple", displayName: "Shore Temple, Mahabalipuram, Chengalpattu, Tamil Nadu, 603104, India", lat: 12.6165, lng: 80.1988, type: "historic" },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() || "";

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        source: "LOCAL_PRESETS",
        results: LOCAL_PRESETS.slice(0, 5),
      });
    }

    const cacheKey = query.toLowerCase();
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({
        success: true,
        source: "CACHE",
        results: cached.data,
      });
    }

    // Check local presets first for instant fuzzy match
    const localMatches = LOCAL_PRESETS.filter(
      (p) =>
        p.label.toLowerCase().includes(cacheKey) ||
        p.displayName.toLowerCase().includes(cacheKey)
    );

    // Call Nominatim with standard OpenStreetMap API parameters
    const nominatimUrl = new URL("https://nominatim.openstreetmap.org/search");
    nominatimUrl.searchParams.set("q", query);
    nominatimUrl.searchParams.set("format", "json");
    nominatimUrl.searchParams.set("addressdetails", "1");
    nominatimUrl.searchParams.set("limit", "6");
    nominatimUrl.searchParams.set("countrycodes", "in"); // Focus on India locations

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const res = await fetch(nominatimUrl.toString(), {
        signal: controller.signal,
        headers: {
          "User-Agent": "VoltWise-AI/1.0 (contact: info@voltwise.ai)",
          "Accept-Language": "en",
        },
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const rawResults = await res.json();
        if (Array.isArray(rawResults) && rawResults.length > 0) {
          const formatted = rawResults.map((item: any, idx: number) => ({
            id: `osm_${item.place_id || idx}`,
            label: item.name || item.display_name?.split(",")[0] || query,
            displayName: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            type: item.type || item.class || "place",
          }));

          cache.set(cacheKey, { data: formatted, timestamp: Date.now() });

          return NextResponse.json({
            success: true,
            source: "NOMINATIM_OSM",
            results: formatted,
          });
        }
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn("Nominatim upstream fetch error, using local fallback:", err?.message || err);
    }

    // Fallback: return matching local landmarks or general preset list
    const fallbackResults = localMatches.length > 0 ? localMatches : LOCAL_PRESETS.slice(0, 5);
    return NextResponse.json({
      success: true,
      source: "FALLBACK_PRESETS",
      results: fallbackResults,
    });
  } catch (error) {
    console.error("GET /api/geocode error:", error);
    return NextResponse.json(
      { success: false, error: "Place search temporarily unavailable", results: [] },
      { status: 500 }
    );
  }
}
