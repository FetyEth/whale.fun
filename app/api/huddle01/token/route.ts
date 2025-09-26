import { NextRequest, NextResponse } from "next/server";
import { createHuddle01Service } from "@/lib/services/huddle01";

export async function POST(request: NextRequest) {
  try {
    const { roomId, userId } = await request.json();

    if (!roomId) {
      return NextResponse.json(
        { error: "Room ID is required" },
        { status: 400 }
      );
    }

    const huddle01Service = createHuddle01Service();
    console.log("Generating token for roomId:", roomId, "userId:", userId);
    const token = await huddle01Service.generateUserAccessToken(roomId, userId);
    console.log("Generated token:", token, "length:", token?.length);

    if (!token) {
      throw new Error("Token generation returned null/undefined");
    }

    return NextResponse.json({
      success: true,
      token: token,
      roomId,
    });
  } catch (error) {
    console.error("Failed to generate access token:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate token",
      },
      { status: 500 }
    );
  }
}
