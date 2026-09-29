import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db-store";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = dbStore.cancelReservation(id);

    if (!success) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Reservation cancelled" });
  } catch (error) {
    console.error("DELETE /api/reservations/[id] error:", error);
    return NextResponse.json({ error: "Failed to cancel reservation" }, { status: 500 });
  }
}
