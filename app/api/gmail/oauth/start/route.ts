import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  createOAuthClient,
  createOAuthState,
  GMAIL_SCOPES,
} from "@/lib/gmail-oauth";

async function getCurrentUser(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  return user;
}

export async function GET(request: Request) {
  const user = await getCurrentUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth = createOAuthClient();
  const url = auth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent select_account",
    scope: GMAIL_SCOPES,
    state: createOAuthState(user.id),
  });

  return NextResponse.json({ url });
}
