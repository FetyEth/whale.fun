import { NextRequest, NextResponse } from "next/server";
import { createHuddle01Service } from "@/lib/services/huddle01";

export async function POST(request: NextRequest) {
  try {
    const { roomId, rtmpUrls } = await request.json();
    if (!roomId) {
      return NextResponse.json({ success: false, error: "roomId is required" }, { status: 400 });
    }
    const huddle = createHuddle01Service();
    const result = await huddle.startLivestream(roomId, Array.isArray(rtmpUrls) ? rtmpUrls : []);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error("POST /huddle01/livestream/start error:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
