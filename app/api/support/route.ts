import { NextResponse } from "next/server";

export async function POST() {
  try {
    // In a real implementation, push to Slack/Discord or log store
    console.log("Support ping:", new Date().toISOString());
    return NextResponse.json({ ok: true, at: Date.now() });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "failed" }, { status: 500 });
  }
}
