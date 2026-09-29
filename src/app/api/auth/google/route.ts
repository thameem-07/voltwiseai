import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db-store";
import { createSessionToken, setSessionCookie, hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = body.email || "driver.google@voltwise.ai";
    const name = body.name || "Google EV Driver";

    let user = dbStore.getUserByEmail(email);
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const dummyHash = await hashPassword(`google_oauth_${Date.now()}`);
      user = dbStore.createUser({
        name,
        email,
        passwordHash: dummyHash,
        role: "DRIVER",
      });

      // Default initial vehicle
      dbStore.createVehicle({
        userId: user.id,
        make: "Tata",
        model: "Nexon EV Max",
        year: 2024,
        batteryCapacityKwh: 40.5,
        connectorType: "CCS2",
        apiSupported: true,
        obdSupported: true,
        connectionMode: "MANUAL",
        currentBatteryPercentage: 55,
        estimatedRangeKm: 190,
        currentLatitude: 13.0418,
        currentLongitude: 80.2341,
        chargingStatus: "IDLE",
      });
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      isNewUser,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    return NextResponse.json({ error: "Google authentication failed" }, { status: 500 });
  }
}
