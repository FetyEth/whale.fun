import { NextRequest, NextResponse } from "next/server";
import { createHuddle01Service } from "@/lib/services/huddle01";
import { createPlatformRTMP } from "@/utils/huddle01Utils";

// Twitch does not provide stream key via API for security; it must be pre-set in env
export async function POST(request: NextRequest) {
  try {
    const { roomId } = await request.json();

    if (!roomId) {
      return NextResponse.json(
        { success: false, error: "Room ID is required" },
        { status: 400 }
      );
    }

    const key = process.env.LIVESTREAM_TWITCH_KEY;
    if (!key) {
      return NextResponse.json(
        { success: false, error: "Missing LIVESTREAM_TWITCH_KEY env" },
        { status: 400 }
      );
    }

    const rtmpUrl = createPlatformRTMP("TWITCH", key);

    const huddle = createHuddle01Service();
    const startRes = await huddle.startLivestream(roomId, [rtmpUrl]);
    if (!startRes.success) {
      return NextResponse.json(
        {
          success: false,
          error: startRes.error || "Failed to start livestream",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Twitch livestream started",
      rtmpUrl,
      livestream: startRes.data,
    });
  } catch (error) {
    console.error("Error starting Twitch livestream:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
