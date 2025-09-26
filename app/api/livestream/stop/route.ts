import { NextRequest, NextResponse } from "next/server";
import { createHuddle01Service } from "@/lib/services/huddle01";

export async function POST(request: NextRequest) {
  try {
    const { roomId } = await request.json();

    if (!roomId) {
      return NextResponse.json(
        { success: false, error: "Room ID is required" },
        { status: 400 }
      );
    }

    // Create Huddle01 service instance
    const huddle01Service = createHuddle01Service();

    // Stop livestream
    const result = await huddle01Service.stopLivestream(roomId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Livestream stopped successfully",
      livestream: result.data,
    });
  } catch (error) {
    console.error("Error stopping livestream:", error);
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

// Alternative GET method using query parameters (for backward compatibility)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");

    if (!roomId) {
      return NextResponse.json(
        { success: false, error: "Room ID is required" },
        { status: 400 }
      );
    }

    // Create Huddle01 service instance
    const huddle01Service = createHuddle01Service();

    // Stop livestream
    const result = await huddle01Service.stopLivestream(roomId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Livestream stopped successfully",
      livestream: result.data,
    });
  } catch (error) {
    console.error("Error stopping livestream:", error);
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
