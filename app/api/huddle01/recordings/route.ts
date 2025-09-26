import { NextRequest, NextResponse } from "next/server";
import { createHuddle01Service } from "@/lib/services/huddle01";

// GET /api/huddle01/recordings?id=optionalRecordingId
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    const huddle = createHuddle01Service();

    if (id) {
      const recording = await huddle.getRecordingById(id);
      if (!recording) {
        return NextResponse.json(
          { success: false, error: "Recording not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, recording });
    }

    const recordings = await huddle.getRecordings();
    return NextResponse.json({
      success: true,
      recordings,
      count: recordings.length,
    });
  } catch (error) {
    console.error("GET /huddle01/recordings error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
