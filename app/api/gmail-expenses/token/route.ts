import { NextRequest, NextResponse } from "next/server";
import {
  createOAuthClient,
  saveGmailConnection,
  verifyOAuthState,
} from "@/lib/gmail-oauth";

function getAppBaseUrl(request: NextRequest) {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    `${request.nextUrl.protocol}//${request.nextUrl.host}`
  );
}

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");

    if (!code || !state) {
      console.error("[Gmail Token] Missing code or state");
      return NextResponse.json(
        {
          error:
            "Missing authorization code or state. Start from the Connect Gmail button in the app.",
        },
        { status: 400 },
      );
    }

    console.log("[Gmail Token] Verifying state...");
    const userId = verifyOAuthState(state);
    console.log("[Gmail Token] State verified for user:", userId);

    console.log("[Gmail Token] Exchanging code for tokens...");
    const auth = createOAuthClient();
    const { tokens } = await auth.getToken(code);

    if (!tokens) {
      console.error("[Gmail Token] No tokens received from Google");
      return NextResponse.redirect(
        `${getAppBaseUrl(request)}/profile?gmail=failed&error=no_tokens`,
      );
    }

    console.log("[Gmail Token] Saving connection to database...");
    await saveGmailConnection({ userId, tokens });

    console.log(`[Gmail Token] ✅ Successfully connected for user ${userId}`);
    return NextResponse.redirect(
      `${getAppBaseUrl(request)}/profile?gmail=connected`,
    );
  } catch (error) {
    console.error("[Gmail Token Callback] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.redirect(
      `${getAppBaseUrl(request)}/profile?gmail=failed&error=${encodeURIComponent(message)}`,
    );
  }
}
