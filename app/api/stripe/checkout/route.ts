import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { getAppBaseUrl, getStripe, MEMBERSHIP_PLAN } from "@/lib/stripe";

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

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = getAppBaseUrl(request);
  const membership = await prisma.membership.findUnique({
    where: { userId: user.id },
  });
  const stripe = getStripe();

  let stripeCustomerId = membership?.stripeCustomerId || null;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    stripeCustomerId = customer.id;

    await prisma.membership.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        stripeCustomerId,
        status: "incomplete",
        plan: MEMBERSHIP_PLAN.id,
      },
      update: {
        stripeCustomerId,
        plan: MEMBERSHIP_PLAN.id,
      },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: MEMBERSHIP_PLAN.currency,
          product_data: {
            name: MEMBERSHIP_PLAN.name,
            description: MEMBERSHIP_PLAN.description,
          },
          unit_amount: MEMBERSHIP_PLAN.amount,
          recurring: { interval: "month" },
        },
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/profile?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/profile?stripe=cancelled`,
    subscription_data: {
      metadata: {
        userId: user.id,
        plan: MEMBERSHIP_PLAN.id,
      },
    },
    metadata: {
      userId: user.id,
      plan: MEMBERSHIP_PLAN.id,
    },
  });

  return NextResponse.json({ url: session.url });
}
