import { NextRequest, NextResponse } from "next/server";
import { createHuddle01Service } from "@/lib/services/huddle01";

// GET /api/huddle01/live-sessions/:roomId
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    if (!roomId) {
      return NextResponse.json(
        { success: false, error: "roomId is required" },
        { status: 400 }
      );
    }
    const huddle = createHuddle01Service();
    const data = await huddle.getLiveSession(roomId);
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error("GET /huddle01/live-sessions/:roomId error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
