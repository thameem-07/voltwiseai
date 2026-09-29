import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db-store";
import { hashPassword, createSessionToken, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, phone, role = "DRIVER" } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    const existing = dbStore.getUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const userRole = role === "ADMIN" ? "ADMIN" : "DRIVER";

    const user = dbStore.createUser({
      name,
      email,
      passwordHash,
      role: userRole,
      phone: phone || undefined,
    });

    // Auto-create a default vehicle for driver
    if (userRole === "DRIVER") {
      dbStore.createVehicle({
        userId: user.id,
        make: "Tata",
        model: "Nexon EV Max",
        year: 2024,
        batteryCapacityKwh: 40.5,
        connectorType: "CCS2",
        apiSupported: true,
        obdSupported: true,
        connectionMode: "SIMULATION",
        currentBatteryPercentage: 45,
        estimatedRangeKm: 160,
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
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
