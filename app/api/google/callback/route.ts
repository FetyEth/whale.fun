import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { setYoutubeTokens } from "@/lib/services/tokenStore";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.YT_CLIENT_ID,
      process.env.YT_CLIENT_SECRET,
      process.env.YT_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return NextResponse.json(
        { error: "No refresh token received. Try adding prompt=consent" },
        { status: 400 }
      );
    }

    // Persist tokens (replace with DB in production)
    await setYoutubeTokens({
      access_token: tokens.access_token || "",
      refresh_token: tokens.refresh_token,
      // Fallback to ~55 minutes from now if expiry is missing
      expiry_date:
        typeof tokens.expiry_date === "number"
          ? tokens.expiry_date
          : Date.now() + 55 * 60 * 1000,
    });

    return NextResponse.json({
      success: true,
      message: "Google OAuth successful",
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      expiry_date: tokens.expiry_date,
    });
  } catch (err) {
    console.error("Google OAuth error:", err);
    return NextResponse.json(
      { error: "OAuth callback failed" },
      { status: 500 }
    );
  }
}
