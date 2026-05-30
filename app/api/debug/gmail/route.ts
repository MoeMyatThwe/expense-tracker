import { NextResponse } from "next/server";
import { getGoogleRedirectUri } from "@/lib/gmail-oauth";

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID || null;
  const redirect = getGoogleRedirectUri();

  return NextResponse.json({ clientId, redirect });
}
