import { NextRequest, NextResponse } from "next/server";
import { createHuddle01Service } from "@/lib/services/huddle01";

export async function GET(_request: NextRequest) {
  try {
    const huddle = createHuddle01Service();
    const data = await huddle.getMetrics();
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error("GET /huddle01/metrics error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
