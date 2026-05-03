import Stripe from "stripe";

export const MEMBERSHIP_PLAN = {
  id: "plus_monthly",
  name: "Cinnamoroll Plus",
  description: "Monthly membership for receipt scanning and premium tracking features.",
  currency: "sgd",
  amount: 50,
} as const;

let stripeClient: Stripe | null = null;

export function getStripe() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  stripeClient ??= new Stripe(stripeSecretKey, {
    apiVersion: "2026-04-22.dahlia",
  });

  return stripeClient;
}

export function getAppBaseUrl(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) return origin;

  const host = request.headers.get("host");
  const protocol = host?.includes("localhost") ? "http" : "https";
  return host ? `${protocol}://${host}` : "http://localhost:3000";
}

export function isActiveMembershipStatus(status?: string | null) {
  return status === "active" || status === "trialing";
}
