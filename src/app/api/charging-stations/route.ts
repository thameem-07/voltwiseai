import { NextRequest, NextResponse } from "next/server";
import { GET as getStations } from "../stations/route";

// Alias endpoint for /api/charging-stations forwarding to normalized station store
export async function GET(req: NextRequest) {
  return getStations(req);
}
