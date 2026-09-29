import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db-store";
import { getSession } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, severity } = body;

    const updated = dbStore.updateFaultReport(id, {
      ...(status && { status }),
      ...(severity && { severity }),
    });

    if (!updated) {
      return NextResponse.json({ error: "Fault report not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, report: updated });
  } catch (error) {
    console.error("PATCH /api/faults/[id] error:", error);
    return NextResponse.json({ error: "Failed to update fault report" }, { status: 500 });
  }
}
