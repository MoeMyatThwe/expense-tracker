import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import {
  getAppBaseUrl,
  getStripe,
  MANUAL_MEMBERSHIP_PLAN,
  MEMBERSHIP_PLAN,
} from "@/lib/stripe";

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

  let renewalMode: "auto" | "manual" = "auto";
  try {
    const body = await request.json();
    renewalMode = body?.renewalMode === "manual" ? "manual" : "auto";
  } catch {
    renewalMode = "auto";
  }

  const plan =
    renewalMode === "manual" ? MANUAL_MEMBERSHIP_PLAN : MEMBERSHIP_PLAN;
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
        plan: plan.id,
      },
      update: {
        stripeCustomerId,
        plan: plan.id,
      },
    });
  }

  const commonSessionData = {
    customer: stripeCustomerId,
    payment_method_types: ["card"] as ["card"],
    line_items: [
      {
        price_data: {
          currency: plan.currency,
          product_data: {
            name:
              renewalMode === "manual"
                ? `${plan.name} - One Month`
                : plan.name,
            description: plan.description,
          },
          unit_amount: plan.amount,
          ...(renewalMode === "auto"
            ? { recurring: { interval: "month" as const } }
            : {}),
        },
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/profile?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/profile?stripe=cancelled`,
    metadata: {
      userId: user.id,
      plan: plan.id,
      renewalMode,
    },
  };

  const session =
    renewalMode === "manual"
      ? await stripe.checkout.sessions.create({
          ...commonSessionData,
          mode: "payment",
          payment_intent_data: {
            metadata: {
              userId: user.id,
              plan: plan.id,
              renewalMode,
            },
          },
        })
      : await stripe.checkout.sessions.create({
          ...commonSessionData,
          mode: "subscription",
          subscription_data: {
            metadata: {
              userId: user.id,
              plan: plan.id,
              renewalMode,
            },
          },
        });

  await prisma.membership.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      stripeCustomerId,
      status: "incomplete",
      plan: plan.id,
    },
    update: {
      stripeCustomerId,
      plan: plan.id,
    },
  });

  return NextResponse.json({ url: session.url });
}
