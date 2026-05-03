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
      throw new Error("Missing Google authorization response");
    }

    const userId = verifyOAuthState(state);
    const auth = createOAuthClient();
    const { tokens } = await auth.getToken(code);

    await saveGmailConnection({ userId, tokens });

    return NextResponse.redirect(
      `${getAppBaseUrl(request)}/profile?gmail=connected`,
    );
  } catch (error) {
    console.error("[Gmail OAuth Callback] Error:", error);
    return NextResponse.redirect(
      `${getAppBaseUrl(request)}/profile?gmail=failed`,
    );
  }
}
