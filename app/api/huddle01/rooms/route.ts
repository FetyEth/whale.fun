import { NextRequest, NextResponse } from "next/server";
import { createHuddle01Service } from "@/lib/services/huddle01";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const pageSize = searchParams.get("pageSize");

    const huddle = createHuddle01Service();
    const data = await huddle.getRooms({
      cursor: cursor ? Number(cursor) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });

    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error("GET /huddle01/rooms error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
