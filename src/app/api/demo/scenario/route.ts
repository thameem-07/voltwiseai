import { NextRequest, NextResponse } from "next/server";
import { activateScenario, demoScenarios } from "@/services/demo-scenarios";

export async function GET() {
  return NextResponse.json({
    success: true,
    scenarios: demoScenarios,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { scenarioId } = await req.json();

    if (!scenarioId) {
      return NextResponse.json({ error: "scenarioId is required" }, { status: 400 });
    }

    const result = activateScenario(scenarioId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/demo/scenario error:", error);
    return NextResponse.json({ error: "Failed to activate scenario" }, { status: 500 });
  }
}
