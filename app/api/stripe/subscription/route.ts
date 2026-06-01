import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { getStripe, isMembershipActive, MEMBERSHIP_PLAN } from "@/lib/stripe";

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

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let membership = await prisma.membership.findUnique({
      where: { userId: user.id },
    });

    // Check Stripe for latest subscription status
    if (membership?.stripeCustomerId) {
      try {
        const stripe = getStripe();
        const subscriptions = await stripe.subscriptions.list({
          customer: membership.stripeCustomerId,
          status: "all",
          limit: 10,
        });

        const subscription =
          subscriptions.data.find((item) =>
            ["active", "trialing", "past_due"].includes(item.status),
          ) || subscriptions.data[0];

        if (subscription) {
          membership = await prisma.membership.update({
            where: { userId: user.id },
            data: {
              stripeSubscriptionId: subscription.id,
              status: subscription.status,
              plan: MEMBERSHIP_PLAN.id,
              currentPeriodEnd: getPeriodEnd(subscription),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            },
          });
        }
      } catch (error) {
        console.error("Error fetching subscription from Stripe:", error);
      }
    }

    return NextResponse.json({
      membership: membership || null,
      isActive: isMembershipActive(
        membership?.status,
        membership?.currentPeriodEnd,
      ),
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 },
    );
  }
}
