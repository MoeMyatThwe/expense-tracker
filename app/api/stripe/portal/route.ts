import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { getAppBaseUrl, stripe } from "@/lib/stripe";

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

export async function POST(request: Request) {
  const user = await getCurrentUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId: user.id },
  });

  if (!membership?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No Stripe customer found for this account" },
      { status: 404 },
    );
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: membership.stripeCustomerId,
    return_url: `${getAppBaseUrl(request)}/profile`,
  });

  return NextResponse.json({ url: portalSession.url });
}
