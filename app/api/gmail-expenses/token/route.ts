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
      return NextResponse.json(
        {
          error:
            "Missing authorization code or state. Start from the Connect Gmail button in the app.",
        },
        { status: 400 },
      );
    }

    const userId = verifyOAuthState(state);
    const auth = createOAuthClient();
    const { tokens } = await auth.getToken(code);

    await saveGmailConnection({ userId, tokens });

    return NextResponse.redirect(
      `${getAppBaseUrl(request)}/profile?gmail=connected`,
    );
  } catch (error) {
    console.error("[Gmail Token Callback] Error:", error);
    return NextResponse.redirect(
      `${getAppBaseUrl(request)}/profile?gmail=failed`,
    );
  }
}
