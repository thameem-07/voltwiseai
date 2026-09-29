import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db-store";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    const userId = session?.userId || "usr_driver_01";
    const notifs = dbStore.getNotifications(userId);
    return NextResponse.json({ success: true, count: notifs.length, notifications: notifs });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { notificationId } = body;

    if (!notificationId) {
      return NextResponse.json({ error: "notificationId is required" }, { status: 400 });
    }

    const success = dbStore.markNotificationRead(notificationId);
    return NextResponse.json({ success });
  } catch (error) {
    console.error("PATCH /api/notifications error:", error);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}
