"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  CreditCard,
  KeyRound,
  Languages,
  Link2,
  Link2Off,
  LogOut,
  Mail,
  Settings,
  Type,
  UserRound,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/app/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { CinnamorollLoader } from "@/components/loading-states";
import {
  applyFontSize,
  type FontSizeChoice,
  getSavedFontSize,
} from "@/components/font-size-provider";
import {
  LANGUAGE_OPTIONS,
  useLanguage,
} from "@/components/language-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";

const fontOptions: { value: FontSizeChoice; label: string }[] = [
  { value: "compact", label: "Small" },
  { value: "comfortable", label: "Normal" },
  { value: "large", label: "Large" },
];

export default function ProfilePage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const router = useRouter();
  const [fontSize, setFontSize] = useState<FontSizeChoice>("comfortable");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [gmailStatus, setGmailStatus] = useState<{
    connected: boolean;
    connection?: { googleEmail?: string | null } | null;
  }>({ connected: false });
  const [gmailLoading, setGmailLoading] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState<"success" | "cancelled" | null>(
    null,
  );
  const [membership, setMembership] = useState<{
    active: boolean;
    plan: { id: string; name: string; amount: number; currency: string };
    billingHistory?: {
      id: string;
      type: string;
      status: string;
      amount: number;
      currency: string;
      date: string;
      description: string;
      hostedInvoiceUrl?: string | null;
    }[];
    membership?: {
      status: string;
      plan?: string;
      currentPeriodEnd?: string | null;
      cancelAtPeriodEnd?: boolean;
      stripeSubscriptionId?: string | null;
    } | null;
  } | null>(null);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [renewalMode, setRenewalMode] = useState<"auto" | "manual">("auto");
  const [paymentHistoryOpen, setPaymentHistoryOpen] = useState(false);

  useEffect(() => {
    setFontSize(getSavedFontSize());
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchGmailStatus();
      fetchMembershipStatus();
    }
  }, [authLoading, user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmail = params.get("gmail");
    const stripeResult = params.get("stripe");
    const stripeSessionId = params.get("session_id");

    if (gmail === "connected") {
      toast.success("Gmail connected");
      fetchGmailStatus();
      router.replace("/profile");
    } else if (gmail === "failed") {
      toast.error("Failed to connect Gmail");
      router.replace("/profile");
    }

    if (stripeResult === "success" && stripeSessionId) {
      setPaymentNotice("success");
      completeStripeCheckout(stripeSessionId);
      router.replace("/profile");
    } else if (stripeResult === "cancelled") {
      setPaymentNotice("cancelled");
      toast.error(t("paymentCancelled"));
      router.replace("/profile");
    }
  }, [router, t]);

  const handleFontSizeChange = (choice: FontSizeChoice) => {
    setFontSize(choice);
    applyFontSize(choice);
  };

  const handleFontSliderChange = (value: string) => {
    handleFontSizeChange(fontOptions[Number(value)].value);
  };

  const fetchGmailStatus = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return;
    }

    const response = await fetch("/api/gmail/oauth/status", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (response.ok) {
      setGmailStatus(await response.json());
    }
  };

  const fetchMembershipStatus = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return;
    }

    const response = await fetch("/api/stripe/membership", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (response.ok) {
      setMembership(await response.json());
    }
  };

  const completeStripeCheckout = async (sessionId: string) => {
    setMembershipLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error("Not authenticated");
        return;
      }

      const response = await fetch("/api/stripe/checkout/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to confirm payment");
      }

      toast.success(t("membershipActivated"));
      await fetchMembershipStatus();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to confirm payment",
      );
    } finally {
      setMembershipLoading(false);
    }
  };

  const startMembershipCheckout = async () => {
    setMembershipLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error("Not authenticated");
        return;
      }

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ renewalMode }),
      });

      const data = await response.json();
      if (!response.ok || !data.url) {
        throw new Error(data.error || "Failed to start payment");
      }

      window.location.href = data.url;
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to start payment",
      );
      setMembershipLoading(false);
    }
  };

  const openBillingPortal = async () => {
    setMembershipLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error("Not authenticated");
        return;
      }

      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();
      if (!response.ok || !data.url) {
        throw new Error(data.error || "Failed to open billing portal");
      }

      window.location.href = data.url;
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to open billing portal",
      );
      setMembershipLoading(false);
    }
  };

  const cancelSubscription = async () => {
    if (!confirm(t("cancelAutoRenewConfirm"))) {
      return;
    }

    setMembershipLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error("Not authenticated");
        return;
      }

      const response = await fetch("/api/stripe/subscription/cancel", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel subscription");
      }

      toast.success(t("autoRenewCancelled"));
      await fetchMembershipStatus();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to cancel subscription",
      );
    } finally {
      setMembershipLoading(false);
    }
  };

  const connectGmail = async () => {
    setGmailLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error("Not authenticated");
        return;
      }

      const response = await fetch("/api/gmail/oauth/start", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();
      if (!response.ok || !data.url) {
        throw new Error(data.error || "Failed to start Gmail connection");
      }

      window.location.href = data.url;
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to connect Gmail",
      );
    } finally {
      setGmailLoading(false);
    }
  };

  const disconnectGmail = async () => {
    setGmailLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error("Not authenticated");
        return;
      }

      const response = await fetch("/api/gmail/oauth/status", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect Gmail");
      }

      setGmailStatus({ connected: false });
      toast.success("Gmail disconnected");
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to disconnect Gmail",
      );
    } finally {
      setGmailLoading(false);
    }
  };

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        throw error;
      }

      setPassword("");
      setConfirmPassword("");
      toast.success("Password updated");
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update password",
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const membershipPeriodEnd = membership?.membership?.currentPeriodEnd
    ? new Date(membership.membership.currentPeriodEnd)
    : null;
  const membershipEndLabel = membershipPeriodEnd
    ? membershipPeriodEnd.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";
  const isManualMembership =
    membership?.membership?.plan === "plus_manual_month" ||
    (!membership?.membership?.stripeSubscriptionId &&
      membership?.membership?.cancelAtPeriodEnd);
  const hasAutoRenewSubscription =
    !isManualMembership &&
    Boolean(membership?.membership?.stripeSubscriptionId) &&
    membership?.membership?.status !== "canceled";
  const canCancelAutoRenew =
    hasAutoRenewSubscription &&
    !membership?.membership?.cancelAtPeriodEnd;
  const membershipAction = membership?.active || hasAutoRenewSubscription
    ? isManualMembership
      ? startMembershipCheckout
      : openBillingPortal
    : startMembershipCheckout;
  const billingHistory = membership?.billingHistory || [];
  const formatBillingAmount = (amount: number, currency: string) =>
    `${currency.toUpperCase()} ${(amount / 100).toFixed(2)}`;

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <CinnamorollLoader label={t("loadingSettings")} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto max-w-3xl px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="cinnamoroll-card mb-6 bg-cover bg-center p-6"
          style={{
            backgroundImage:
              "url('/assets/cinamoroll_theme/background/CategoryBannerBackground.png')",
          }}
        >
          <div className="flex items-center gap-4">
            <Image
              src="/assets/cinamoroll_theme/App Logo/profile.png"
              alt="Settings"
              width={72}
              height={72}
              className="h-18 w-18 rounded-full border-2 border-[#D4E5F7] bg-white object-cover"
            />
            <div>
              <h1 className="text-3xl font-bold text-[#859BB2]">
                {t("settings")}
              </h1>
              <p className="text-sm text-gray-600">
                {t("settingsSubtitle")}
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="cinnamoroll-card p-6"
          >
            <div className="mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5 text-[#859BB2]" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {t("appearance")}
              </h2>
            </div>

            <div className="grid gap-4">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-[#E1EDFD] bg-white/70 p-4 dark:bg-slate-900/60">
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-100">
                    {t("theme")}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t("themeDesc")}
                  </p>
                </div>
                <ThemeToggle />
              </div>

              <div className="rounded-xl border border-[#E1EDFD] bg-white/70 p-4 dark:bg-slate-900/60">
                <div className="mb-3 flex items-center gap-2">
                  <Type className="h-5 w-5 text-[#859BB2]" />
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-100">
                      {t("textSize")}
                    </p>
                    <p className="text-sm text-gray-500">
                      {t("textSizeDesc")}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-[#E1EDFD] bg-white p-4 dark:bg-slate-950">
                  <div className="mb-3 flex items-center justify-between text-xs font-medium text-[#859BB2]">
                    {fontOptions.map((option) => (
                      <span key={option.value}>
                        {option.value === "compact"
                          ? t("small")
                          : option.value === "comfortable"
                            ? t("normal")
                            : t("large")}
                      </span>
                    ))}
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="1"
                    value={fontOptions.findIndex(
                      (option) => option.value === fontSize,
                    )}
                    onChange={(event) =>
                      handleFontSliderChange(event.target.value)
                    }
                    aria-label="Text size"
                    className="font-size-slider w-full"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-[#E1EDFD] bg-white/70 p-4 dark:bg-slate-900/60">
                <div className="flex items-center gap-2">
                  <Languages className="h-5 w-5 text-[#859BB2]" />
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-100">
                      {t("language")}
                    </p>
                    <p className="text-sm text-gray-500">
                      {t("languageDesc")}
                    </p>
                  </div>
                </div>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-36 rounded-xl border-[#D4E5F7] bg-white text-[#334155]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="cinnamoroll-card p-6"
          >
            <div className="mb-4 flex items-center gap-2">
              <UserRound className="h-5 w-5 text-[#859BB2]" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {t("account")}
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-[#E1EDFD] bg-white/70 p-4 dark:bg-slate-900/60">
                <Mail className="h-5 w-5 text-[#859BB2]" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">{t("email")}</p>
                  <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                    {user?.email}
                  </p>
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-[#E1EDFD] bg-white/70 p-4 dark:bg-slate-900/60">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                  <CreditCard className="h-5 w-5 shrink-0 text-[#859BB2]" />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 dark:text-gray-100">
                      {t("membership")}
                    </p>
                    <p className="text-sm text-gray-500">
                      {membership?.active
                        ? t("membershipActive", {
                            status:
                              membership.membership?.status || "active",
                          })
                        : t("membershipDesc")}
                    </p>
                    {membership?.active && membershipEndLabel ? (
                      <p className="mt-1 text-xs font-medium text-[#859BB2]">
                        {membership.membership?.cancelAtPeriodEnd
                          ? t("membershipEndsOn", {
                              date: membershipEndLabel,
                            })
                          : isManualMembership
                          ? t("membershipExpiresOn", {
                              date: membershipEndLabel,
                            })
                          : t("membershipRenewsOn", {
                              date: membershipEndLabel,
                            })}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs font-medium text-[#859BB2]">
                      {membership?.plan
                        ? `${membership.plan.currency.toUpperCase()} ${(membership.plan.amount / 100).toFixed(2)} / ${t("month")}`
                        : `SGD 4.99 / ${t("month")}`}
                    </p>
                  </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <Button
                      type="button"
                      onClick={membershipAction}
                      disabled={membershipLoading}
                      className="h-10 rounded-xl bg-[#B2D7FF] px-4 text-white hover:bg-[#9AC4E7]"
                    >
                      {membershipLoading
                        ? t("loading")
                        : membership?.active
                          ? isManualMembership
                            ? t("renewManually")
                            : t("manageBilling")
                          : t("continuePayment")}
                    </Button>
                    {canCancelAutoRenew ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={cancelSubscription}
                        disabled={membershipLoading}
                        className="h-10 rounded-xl border-[#D4E5F7] bg-white/80 px-4 text-[#64748b] hover:bg-[#E1EDFD]"
                      >
                        {t("cancelAutoRenew")}
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(["auto", "manual"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setRenewalMode(mode)}
                      className={`rounded-xl border px-3 py-2 text-left transition ${
                        renewalMode === mode
                          ? "border-[#9AC4E7] bg-[#D4E5F7] text-gray-800 shadow-sm"
                          : "border-[#E1EDFD] bg-white/80 text-gray-600 hover:bg-[#E1EDFD]"
                      }`}
                    >
                      <span className="block text-sm font-semibold">
                        {mode === "auto" ? t("autoRenew") : t("manualRenew")}
                      </span>
                      <span className="mt-1 block text-xs leading-snug text-[#859BB2]">
                        {mode === "auto"
                          ? t("autoRenewDesc")
                          : t("manualRenewDesc")}
                      </span>
                    </button>
                  ))}
                </div>
                {paymentNotice ? (
                  <div className="rounded-xl border border-[#D4E5F7] bg-[#E1EDFD]/70 px-4 py-3 text-sm text-gray-700">
                    <p className="font-semibold text-gray-800">
                      {paymentNotice === "success"
                        ? t("paymentSuccessTitle")
                        : t("paymentCancelledTitle")}
                    </p>
                    <p className="mt-1 text-[#64748b]">
                      {paymentNotice === "success"
                        ? t("paymentSuccessDesc")
                        : t("paymentCancelledDesc")}
                    </p>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E1EDFD] bg-white/80 p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-800">
                        {t("paymentHistory")}
                      </p>
                      <span className="rounded-full bg-[#E1EDFD] px-2 py-1 text-xs font-medium text-[#859BB2]">
                        {billingHistory.length}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#859BB2]">
                      {billingHistory.length > 0
                        ? t("paymentHistoryHidden")
                        : t("noPaymentHistory")}
                    </p>
                  </div>
                  {billingHistory.length > 0 ? (
                    <div className="hidden">
                      {billingHistory.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 rounded-lg bg-[#F8FBFF] px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-800">
                              {item.description}
                            </p>
                            <p className="text-xs text-[#859BB2]">
                              {new Date(item.date).toLocaleDateString(
                                undefined,
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}{" "}
                              · {item.status}
                            </p>
                          </div>
                          <p className="shrink-0 text-sm font-semibold text-[#859BB2]">
                            {formatBillingAmount(item.amount, item.currency)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="hidden">
                      {t("noPaymentHistory")}
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPaymentHistoryOpen(true)}
                    disabled={billingHistory.length === 0}
                    className="h-9 shrink-0 rounded-xl border-[#D4E5F7] bg-[#E1EDFD]/70 px-4 text-[#64748b] hover:bg-[#D4E5F7]"
                  >
                    {t("view")}
                  </Button>
                </div>
                {membership?.active &&
                  membership.membership?.cancelAtPeriodEnd &&
                  !isManualMembership ? (
                  <p className="rounded-xl border border-[#D4E5F7] bg-[#E1EDFD]/60 px-4 py-3 text-sm text-[#64748b]">
                    {t("autoRenewCancelScheduled")}
                  </p>
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-[#E1EDFD] bg-white/70 p-4 dark:bg-slate-900/60">
                <div className="flex min-w-0 items-center gap-3">
                  {gmailStatus.connected ? (
                    <Link2 className="h-5 w-5 shrink-0 text-[#859BB2]" />
                  ) : (
                    <Link2Off className="h-5 w-5 shrink-0 text-[#859BB2]" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 dark:text-gray-100">
                      {t("gmailConnection")}
                    </p>
                    <p className="text-sm text-gray-500">
                      {gmailStatus.connected
                        ? t("gmailConnected", {
                            email:
                              gmailStatus.connection?.googleEmail || "Gmail",
                          })
                        : t("gmailConnectionDesc")}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={
                    gmailStatus.connected ? disconnectGmail : connectGmail
                  }
                  disabled={gmailLoading}
                  className="h-10 shrink-0 rounded-xl bg-[#B2D7FF] px-4 text-white hover:bg-[#9AC4E7]"
                >
                  {gmailLoading
                    ? t("connecting")
                    : gmailStatus.connected
                      ? t("disconnectGmail")
                      : t("connectGmail")}
                </Button>
              </div>

              <form
                onSubmit={handlePasswordChange}
                className="rounded-xl border border-[#E1EDFD] bg-white/70 p-4 dark:bg-slate-900/60"
              >
                <div className="mb-3 flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-[#859BB2]" />
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-100">
                      {t("changePassword")}
                    </p>
                    <p className="text-sm text-gray-500">
                      {t("changePasswordDesc")}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={t("newPassword")}
                      className="rounded-xl border-[#D4E5F7] pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <Input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder={t("confirmPassword")}
                    className="rounded-xl border-[#D4E5F7]"
                  />

                  <Button
                    type="submit"
                    disabled={passwordLoading}
                    className="h-10 rounded-xl bg-[#B2D7FF] text-white hover:bg-[#9AC4E7]"
                  >
                    {passwordLoading ? t("updating") : t("updatePassword")}
                  </Button>
                </div>
              </form>

              <Button
                onClick={signOut}
                variant="outline"
                className="h-11 w-fit rounded-xl border-[#D4E5F7] px-6 text-[#859BB2] hover:bg-[#E1EDFD]"
              >
                <LogOut className="h-4 w-4" />
                {t("logout")}
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
      <Dialog open={paymentHistoryOpen} onOpenChange={setPaymentHistoryOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-hidden rounded-2xl border-2 border-[#D4E5F7] p-0 sm:max-w-lg">
          <div className="flex max-h-[calc(100dvh-2rem)] flex-col bg-[#F8FBFF]">
            <DialogHeader className="shrink-0 space-y-2 px-6 pt-6">
              <DialogTitle className="text-2xl text-[#859BB2]">
                {t("paymentHistory")}
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                {t("paymentHistoryDesc")}
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-6 py-4">
              {billingHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#E1EDFD] bg-white px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-800">
                      {item.description}
                    </p>
                    <p className="text-xs text-[#859BB2]">
                      {new Date(item.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      - {item.status}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-[#859BB2]">
                    {formatBillingAmount(item.amount, item.currency)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
