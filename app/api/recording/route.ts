import { NextRequest, NextResponse } from "next/server";
import { createHuddle01Service } from "@/lib/services/huddle01";

// Get all recordings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const recordingId = searchParams.get("id");

    // Create Huddle01 service instance
    const huddle01Service = createHuddle01Service();

    if (recordingId) {
      // Get specific recording by ID
      const recording = await huddle01Service.getRecordingById(recordingId);

      if (!recording) {
        return NextResponse.json(
          { success: false, error: "Recording not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        recording,
      });
    } else {
      // Get all recordings
      const recordings = await huddle01Service.getRecordings();

      return NextResponse.json({
        success: true,
        recordings,
        count: recordings.length,
      });
    }
  } catch (error) {
    console.error("Error fetching recordings:", error);
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
