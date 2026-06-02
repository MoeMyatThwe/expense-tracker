import Stripe from "stripe";

export const MEMBERSHIP_PLAN = {
  id: "plus_monthly",
  name: "Cinnamoroll Plus",
  description: "Monthly membership for receipt scanning and premium tracking features.",
  currency: "sgd",
  amount: 50,
} as const;

export const MANUAL_MEMBERSHIP_PLAN = {
  ...MEMBERSHIP_PLAN,
  id: "plus_manual_month",
  description: "One month of premium receipt scanning and tracking features.",
} as const;

let stripeClient: Stripe | null = null;

export function getStripe() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  stripeClient ??= new Stripe(stripeSecretKey, {
    apiVersion: "2026-05-27.dahlia",
  });

  return stripeClient;
}

export function getAppBaseUrl(request: Request) {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || null;
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== "null") return origin;

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProtocol = request.headers.get("x-forwarded-proto");
  const host = forwardedHost || request.headers.get("host");
  const protocol =
    forwardedProtocol || (host?.includes("localhost") ? "http" : "https");
  return host ? `${protocol}://${host}` : "http://localhost:3000";
}

export function isActiveMembershipStatus(status?: string | null) {
  return status === "active" || status === "trialing";
}

export function isMembershipActive(
  status?: string | null,
  currentPeriodEnd?: Date | string | null,
) {
  if (!isActiveMembershipStatus(status)) return false;

  if (!currentPeriodEnd) return true;

  return new Date(currentPeriodEnd).getTime() > Date.now();
}
