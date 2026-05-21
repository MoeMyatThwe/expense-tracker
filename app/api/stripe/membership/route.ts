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

    const billingHistory = [];

    if (membership?.stripeCustomerId) {
      try {
        const stripe = getStripe();
        const [subscriptions, checkoutSessions, invoices] = await Promise.all([
          stripe.subscriptions.list({
            customer: membership.stripeCustomerId,
            status: "all",
            limit: 10,
          }),
          stripe.checkout.sessions.list({
            customer: membership.stripeCustomerId,
            limit: 5,
          }),
          stripe.invoices.list({
            customer: membership.stripeCustomerId,
            limit: 5,
          }),
        ]);

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

        billingHistory.push(
          ...checkoutSessions.data
            .filter((session) => session.payment_status === "paid")
            .map((session) => ({
              id: session.id,
              type: session.mode === "subscription" ? "subscription" : "payment",
              status: session.payment_status,
              amount: session.amount_total || 0,
              currency: session.currency || MEMBERSHIP_PLAN.currency,
              date: new Date(session.created * 1000).toISOString(),
              description:
                session.mode === "subscription"
                  ? "Membership subscription checkout"
                  : "One month membership payment",
            })),
          ...invoices.data
            .filter((invoice) => invoice.status === "paid")
            .map((invoice) => ({
              id: invoice.id,
              type: "invoice",
              status: invoice.status,
              amount: invoice.amount_paid || 0,
              currency: invoice.currency || MEMBERSHIP_PLAN.currency,
              date: new Date(invoice.created * 1000).toISOString(),
              description: "Membership renewal invoice",
              hostedInvoiceUrl: invoice.hosted_invoice_url,
            })),
        );
      } catch (error) {
        console.error("Error fetching billing history:", error);
      }
    }

    return NextResponse.json({
      plan: MEMBERSHIP_PLAN,
      membership,
      billingHistory: billingHistory
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        )
        .slice(0, 5),
      active: isMembershipActive(
        membership?.status,
        membership?.currentPeriodEnd,
      ),
    });
  } catch (error) {
    console.error("Error fetching membership:", error);
    return NextResponse.json(
      { error: "Failed to fetch membership" },
      { status: 500 },
    );
  }
}
