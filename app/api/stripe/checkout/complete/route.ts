import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { MEMBERSHIP_PLAN, stripe } from "@/lib/stripe";

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

function getPeriodEnd(subscription: Stripe.Subscription) {
  const periodEnd = subscription.items.data[0]?.current_period_end;
  return periodEnd ? new Date(periodEnd * 1000) : null;
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await request.json();
  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json({ error: "Missing session id" }, { status: 400 });
  }

  const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription", "customer"],
  });

  if (checkoutSession.metadata?.userId !== user.id) {
    return NextResponse.json({ error: "Invalid checkout session" }, { status: 403 });
  }

  const subscription =
    typeof checkoutSession.subscription === "string"
      ? await stripe.subscriptions.retrieve(checkoutSession.subscription)
      : checkoutSession.subscription;

  const customerId =
    typeof checkoutSession.customer === "string"
      ? checkoutSession.customer
      : checkoutSession.customer?.id || null;

  if (!subscription || !customerId) {
    return NextResponse.json(
      { error: "Checkout session is not linked to a subscription" },
      { status: 400 },
    );
  }

  const membership = await prisma.membership.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      plan: MEMBERSHIP_PLAN.id,
      currentPeriodEnd: getPeriodEnd(subscription),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    update: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      plan: MEMBERSHIP_PLAN.id,
      currentPeriodEnd: getPeriodEnd(subscription),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  return NextResponse.json({ membership });
}
