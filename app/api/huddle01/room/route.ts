import { NextRequest, NextResponse } from "next/server";
import { createHuddle01Service } from "@/lib/services/huddle01";

export async function POST(request: NextRequest) {
  try {
    const { title, hostWallets, roomType, description } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: "Room title is required" },
        { status: 400 }
      );
    }

    const huddle01Service = createHuddle01Service();
    const roomData = await huddle01Service.createRoom(
      title,
      hostWallets,
      roomType,
      description
    );

    return NextResponse.json({
      success: true,
      ...roomData,
    });
  } catch (error) {
    console.error("Failed to create room:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create room",
      },
      { status: 500 }
    );
  }
}
