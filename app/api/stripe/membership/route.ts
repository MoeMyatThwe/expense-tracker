import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { isActiveMembershipStatus, MEMBERSHIP_PLAN } from "@/lib/stripe";

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

  const membership = await prisma.membership.findUnique({
    where: { userId: user.id },
  });

  return NextResponse.json({
    plan: MEMBERSHIP_PLAN,
    membership,
    active: isActiveMembershipStatus(membership?.status),
  });
}
