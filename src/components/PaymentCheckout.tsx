import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  HelpCircle,
  IndianRupee,
  Landmark,
  Lock,
  QrCode,
  ShieldCheck,
  Smartphone,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";

import { apiFailureMessage, authorizedFetch, readApiJson } from "../config";
import { useAuth } from "../lib/AuthContext.tsx";
import { usePermissions } from "../subscriptions/SubscriptionProvider";
import type { PlanId } from "../subscriptions/permissions";
import Logo from "./Logo.tsx";

interface PaymentCheckoutProps {
  plan: {
    id?: PlanId;
    name: string;
    price: string;
    amountPaise: number;
  };
  onBack: () => void;
  onCancel?: () => void;
  onComplete?: () => void;
}

interface CreateOrderResponse {
  success: boolean;
  order_id: string;
  amount: number;
  currency: string;
}

interface VerifyPaymentResponse {
  success: boolean;
  order_id: string;
  payment_id: string;
  session?: unknown;
}

interface PaymentStatusResponse {
  success: boolean;
  order_id: string;
  status: "pending" | "processing" | "success" | "failed" | "refunded" | string;
  payment_status: string;
  payment_id?: string;
  subscription_active?: boolean;
  message?: string;
}

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayFailedResponse {
  error?: {
    description?: string;
    reason?: string;
    code?: string;
  };
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  image?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  config?: {
    display?: {
      hide?: Array<{
        method: "upi" | "card" | "netbanking" | "wallet" | "emi" | "paylater";
      }>;
      sequence?: string[];
      preferences?: {
        show_default_blocks?: boolean;
      };
    };
  };
  modal?: {
    ondismiss?: () => void;
  };
  handler: (response: RazorpaySuccessResponse) => void;
}

interface RazorpayCheckoutInstance {
  open: () => void;
  on: (eventName: "payment.failed", handler: (response: RazorpayFailedResponse) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

function planIdFromName(planName: string): PlanId | null {
  const normalized = planName.toLowerCase();
  if (normalized === "go" || normalized === "pro" || normalized === "enterprise") return normalized;
  return null;
}

function validAmountPaise(amount: number) {
  return Number.isFinite(amount) && amount >= 100 ? Math.round(amount) : 0;
}

function formatInrFromPaise(amount: number) {
  if (!amount) return "Unavailable";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function paymentErrorMessage(error: unknown) {
  const message = apiFailureMessage(error, "Payment could not be completed. Please try again.");
  if (/http 5\d\d/i.test(message) || /backend request failed/i.test(message)) {
    return "Payment service is temporarily unavailable. Please try again in a moment.";
  }
  if (/invalid or expired authentication session/i.test(message)) {
    return "Your payment may still be processing. Please sign in again if needed; Adviso AI will recover the payment from Razorpay automatically.";
  }
  if (/cancelled/i.test(message)) return "Payment was cancelled before completion.";
  return message;
}

const CHECKOUT_STORAGE_KEY = "adviso_pending_checkout";

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function PaymentCheckout({ plan, onBack, onCancel, onComplete }: PaymentCheckoutProps) {
  const { profile, user } = useAuth();
  const { refreshSubscription } = usePermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [checkoutMessage, setCheckoutMessage] = useState("");

  const targetPlanId = useMemo(() => plan.id || planIdFromName(plan.name), [plan.id, plan.name]);
  const amountPaise = validAmountPaise(plan.amountPaise);
  const amountLabel = amountPaise ? formatInrFromPaise(amountPaise) : "Unavailable";
  const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID || "";
  const checkoutStorageKey = user?.uid ? `${CHECKOUT_STORAGE_KEY}:${user.uid}` : CHECKOUT_STORAGE_KEY;

  const clearPendingCheckout = () => {
    try {
      window.localStorage.removeItem(checkoutStorageKey);
    } catch {
      // Ignore storage failures; payment state still lives on the backend.
    }
  };

  const rememberPendingCheckout = (orderId: string) => {
    try {
      window.localStorage.setItem(
        checkoutStorageKey,
        JSON.stringify({
          orderId,
          planId: targetPlanId,
          createdAt: Date.now(),
        }),
      );
    } catch {
      // Browser storage is only a recovery helper.
    }
  };

  const completeFromStatus = async (status: PaymentStatusResponse) => {
    setPaymentId(status.payment_id || "");
    await refreshSubscription({ notify: true });
    clearPendingCheckout();
    setSuccess(true);
  };

  const checkPaymentStatus = async (orderId: string) => {
    const response = await authorizedFetch(`/api/payments/${encodeURIComponent(orderId)}/status`);
    return readApiJson<PaymentStatusResponse>(response);
  };

  const pollPaymentStatus = async (orderId: string, timeoutMs = 120_000) => {
    const startedAt = Date.now();
    let lastStatus: PaymentStatusResponse | null = null;
    setCheckoutMessage("Confirming payment with Razorpay...");

    while (Date.now() - startedAt < timeoutMs) {
      lastStatus = await checkPaymentStatus(orderId);
      if (lastStatus.status === "success" || lastStatus.subscription_active) {
        await completeFromStatus(lastStatus);
        return;
      }
      if (lastStatus.status === "failed" || lastStatus.status === "refunded") {
        clearPendingCheckout();
        throw new Error(lastStatus.message || "Payment could not be completed.");
      }
      await sleep(3000);
    }

    throw new Error(
      lastStatus?.message ||
        "Payment is still being confirmed by Razorpay. You can return to the dashboard and the plan will update automatically after webhook verification.",
    );
  };

  const verifyPayment = async (response: RazorpaySuccessResponse) => {
    setCheckoutMessage("Verifying payment securely...");
    const verifyResponse = await authorizedFetch("/api/verify-payment", {
      method: "POST",
      body: JSON.stringify(response),
    });
    const verification = await readApiJson<VerifyPaymentResponse>(verifyResponse);
    if (!verification.success) throw new Error("Payment verification failed.");
    setPaymentId(verification.payment_id);
    clearPendingCheckout();
    await refreshSubscription({ notify: true });
    setSuccess(true);
  };

  useEffect(() => {
    if (!user || success) return;

    let cancelled = false;
    const recoverPayment = async () => {
      try {
        const raw = window.localStorage.getItem(checkoutStorageKey);
        if (!raw) return;
        const pending = JSON.parse(raw) as { orderId?: string; planId?: string; createdAt?: number };
        if (!pending.orderId || pending.planId !== targetPlanId) return;
        if (pending.createdAt && Date.now() - pending.createdAt > 45 * 60 * 1000) {
          clearPendingCheckout();
          return;
        }

        setIsProcessing(true);
        setCheckoutMessage("Recovering payment status...");
        const status = await checkPaymentStatus(pending.orderId);
        if (cancelled) return;
        if (status.status === "success" || status.subscription_active) {
          await completeFromStatus(status);
          return;
        }
        if (status.status === "failed" || status.status === "refunded") {
          clearPendingCheckout();
          setErrorMessage(status.message || "Previous payment attempt could not be completed.");
        }
      } catch {
        // Recovery is best-effort; the normal checkout path can still proceed.
      } finally {
        if (!cancelled) {
          setIsProcessing(false);
          setCheckoutMessage("");
        }
      }
    };

    void recoverPayment();
    return () => {
      cancelled = true;
    };
  }, [checkoutStorageKey, success, targetPlanId, user]);

  const startCheckout = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage("");

    if (!user) {
      setErrorMessage("Sign in before checkout so the subscription can be attached to your workspace.");
      return;
    }

    if (!razorpayKeyId) {
      setErrorMessage("Razorpay public key is missing. Add VITE_RAZORPAY_KEY_ID to the frontend environment.");
      return;
    }

    const RazorpayConstructor = window.Razorpay;
    if (!RazorpayConstructor) {
      setErrorMessage("Razorpay checkout script did not load. Check your network connection and retry.");
      return;
    }

    if (!amountPaise) {
      setErrorMessage("The selected plan amount is invalid. Minimum Razorpay order amount is 100 paise.");
      return;
    }

    if (!targetPlanId) {
      setErrorMessage("The selected plan is not available for checkout.");
      return;
    }

    setIsProcessing(true);
    setCheckoutMessage("Creating secure Razorpay order...");

    try {
      const orderResponse = await authorizedFetch("/api/create-order", {
        method: "POST",
        body: JSON.stringify({
          amount: amountPaise,
          currency: "INR",
          plan_id: targetPlanId,
          receipt: `adviso_${plan.name.toLowerCase()}_${Date.now()}`.slice(0, 40),
        }),
      });
      const order = await readApiJson<CreateOrderResponse>(orderResponse);
      rememberPendingCheckout(order.order_id);
      setCheckoutMessage("Opening Razorpay checkout...");

      await new Promise<void>((resolve, reject) => {
        const checkout = new RazorpayConstructor({
          key: razorpayKeyId,
          amount: order.amount,
          currency: order.currency,
          name: "Adviso AI",
          description: `${plan.name} subscription`,
          order_id: order.order_id,
          image: "/favicon.png",
          prefill: {
            name: profile?.full_name || user.displayName || "",
            email: profile?.email || user.email || "",
          },
          theme: {
            color: "#2563eb",
          },
          config: {
            display: {
              sequence: ["upi", "card"],
              hide: [
                { method: "netbanking" },
                { method: "wallet" },
                { method: "emi" },
                { method: "paylater" },
              ],
              preferences: {
                show_default_blocks: false,
              },
            },
          },
          modal: {
            ondismiss: () => {
              setCheckoutMessage("Checking whether Razorpay completed the payment...");
              pollPaymentStatus(order.order_id, 18_000)
                .then(resolve)
                .catch(() => reject(new Error("Payment was cancelled before completion.")));
            },
          },
          handler: (paymentResponse) => {
            verifyPayment(paymentResponse)
              .then(resolve)
              .catch(() => {
                pollPaymentStatus(paymentResponse.razorpay_order_id, 120_000)
                  .then(resolve)
                  .catch(reject);
              });
          },
        });

        checkout.on("payment.failed", (failure) => {
          reject(new Error(failure.error?.description || failure.error?.reason || "Payment failed in Razorpay Checkout."));
        });

        checkout.open();
      });
    } catch (error) {
      setErrorMessage(paymentErrorMessage(error));
    } finally {
      setIsProcessing(false);
      setCheckoutMessage("");
    }
  };

  if (success) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 p-6 text-slate-950 selection:bg-blue-500/20 transition-colors duration-500 dark:bg-[#07101f] dark:text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-sky-50 dark:from-[#07101f] dark:via-[#0a1427] dark:to-[#030711]" />
        <div className="absolute left-[-12%] top-[-18%] h-[480px] w-[560px] rounded-full bg-blue-400/20 blur-[110px] dark:bg-blue-500/15" />
        <div className="absolute bottom-[-20%] right-[-12%] h-[560px] w-[620px] rounded-full bg-cyan-300/20 blur-[120px] dark:bg-cyan-400/10" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-emerald-200/80 bg-white/90 p-8 text-center shadow-[0_28px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-emerald-400/20 dark:bg-slate-900/80 dark:shadow-black/30"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-blue-500/5" />
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-500/10">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>
          <div className="relative">
            <h2 className="mb-2 text-3xl font-black text-slate-950 dark:text-white">Payment Successful</h2>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              Your {plan.name} subscription is verified and active for this workspace.
            </p>
            {paymentId && (
              <p className="mt-3 break-all font-mono text-[11px] text-slate-500 dark:text-slate-400">
                Payment ID: {paymentId}
              </p>
            )}
          </div>
          <button
            onClick={onComplete || onBack}
            className="relative w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-4 font-black text-white shadow-lg shadow-emerald-500/20 transition-transform hover:-translate-y-0.5"
          >
            Go to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-50 text-slate-950 selection:bg-blue-500/20 transition-colors duration-500 dark:bg-[#07101f] dark:text-white">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-sky-50 dark:from-[#07101f] dark:via-[#0a1427] dark:to-[#030711]" />
      <div className="absolute left-[-10%] top-[-18%] h-[520px] w-[680px] rounded-full bg-blue-400/20 blur-[130px] dark:bg-blue-500/15" />
      <div className="absolute bottom-[-22%] right-[-14%] h-[620px] w-[720px] rounded-full bg-cyan-300/20 blur-[150px] dark:bg-cyan-400/10" />
      <div className="absolute inset-x-0 top-0 h-80 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0))] dark:bg-[linear-gradient(180deg,rgba(7,16,31,0.9),rgba(7,16,31,0))]" />

      <header className="relative z-20 border-b border-slate-200/80 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/50">
        <div className="mx-auto flex h-20 w-full max-w-[1760px] items-center justify-between px-6 md:px-10 xl:px-14">
          <div>
            <Logo size="md" className="text-slate-950 dark:text-white" />
            <div className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
              Platform Workspace
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            <Lock className="h-3.5 w-3.5" />
            <span>Secured by</span>
            <span className="text-base font-black italic text-[#0b3f8f] dark:text-blue-300">Razorpay</span>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto w-full max-w-[1760px] px-6 py-8 md:px-10 lg:py-10 xl:px-14">
        <button
          onClick={onCancel || onBack}
          className="mb-8 inline-flex items-center gap-2 text-sm font-black text-slate-600 transition-colors hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-300"
        >
          <ArrowLeft className="h-4 w-4" /> Back to workspace
        </button>

        <div className="grid grid-cols-1 items-start gap-10 xl:grid-cols-[500px_minmax(0,1fr)] xl:gap-20">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8 xl:pt-10"
          >
            <div className="space-y-5">
              <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.26em] text-blue-600 dark:text-blue-300">
                Powered by Razorpay
              </span>
              <h1 className="max-w-xl text-4xl font-black leading-[1.05] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl dark:text-white">
                Pay securely with UPI{" "}
                <span className="block bg-gradient-to-r from-[#145DFF] to-[#20D7FF] bg-clip-text text-transparent">
                  or card
                </span>
              </h1>
              <p className="max-w-md text-base font-medium leading-8 text-slate-600 dark:text-slate-300">
                Enter your details inside Razorpay checkout, complete the payment, and get instant access to your plan after secure verification.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-blue-600 shadow-sm dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-300">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-black text-slate-950 dark:text-white">100% secure payments</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    All transactions are encrypted and verified through Razorpay.
                  </p>
                </div>
              </div>
              <div className="flex gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <Zap className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-black text-slate-950 dark:text-white">Instant access</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    Your plan activates immediately after payment verification.
                  </p>
                </div>
              </div>
              <div className="flex gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 text-violet-600 shadow-sm dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-300">
                  <HelpCircle className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-black text-slate-950 dark:text-white">Need help?</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    Our support team is here to help you at any time.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-[0_22px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-black uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
                    {plan.name} Plan
                  </div>
                  <div className="mt-3 flex items-end gap-2">
                    <span className="text-4xl font-black text-slate-950 dark:text-white">{amountLabel}</span>
                    <span className="pb-1 text-sm font-bold text-slate-500 dark:text-slate-400">INR</span>
                  </div>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                  Secure checkout
                </span>
              </div>
              <div className="space-y-3 border-t border-slate-200 pt-5 dark:border-white/10">
                {["UPI, QR, and card checkout", "Secure server-side verification", "Instant plan activation"].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white/65 p-4 text-xs font-bold text-slate-600 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400 sm:grid-cols-3">
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-300" /> PCI DSS compliant
              </span>
              <span className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-slate-500 dark:text-slate-400" /> 256-bit SSL
              </span>
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-500 dark:text-slate-400" /> Razorpay trusted
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full"
          >
            <form
              onSubmit={startCheckout}
              className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/95 shadow-[0_30px_100px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/90 dark:shadow-black/30"
            >
              <div className="border-b border-slate-200 px-6 py-6 dark:border-white/10 sm:px-8">
                <h2 className="text-xl font-black text-slate-950 dark:text-white">Choose a payment method</h2>
              </div>

              <div className="grid min-h-[560px] lg:grid-cols-[280px_minmax(0,1fr)]">
                <div className="border-b border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-slate-950/30 lg:border-b-0 lg:border-r">
                  <button
                    type="button"
                    className="flex w-full items-center gap-4 border-b border-blue-200 bg-blue-50/90 px-6 py-6 text-left dark:border-blue-400/20 dark:bg-blue-500/10"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm dark:bg-blue-500/10 dark:text-blue-300">
                      <QrCode className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block font-black text-blue-700 dark:text-blue-200">UPI</span>
                      <span className="mt-1 block text-xs font-bold text-blue-500 dark:text-blue-300">
                        Pay using any UPI app
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-4 border-b border-slate-200 px-6 py-6 text-left transition-colors hover:bg-white/70 dark:border-white/10 dark:hover:bg-white/[0.04]"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm dark:bg-white/5 dark:text-slate-300">
                      <CreditCard className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block font-black text-slate-800 dark:text-white">Card</span>
                      <span className="mt-1 block text-xs font-bold text-slate-500 dark:text-slate-400">
                        Visa, Mastercard, RuPay
                      </span>
                    </span>
                  </button>
                  <div className="flex items-center gap-4 border-b border-slate-200 px-6 py-6 text-left opacity-65 dark:border-white/10">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm dark:bg-white/5 dark:text-slate-500">
                      <Landmark className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block font-black text-slate-700 dark:text-slate-300">Netbanking</span>
                      <span className="mt-1 block text-xs font-bold text-slate-500 dark:text-slate-500">
                        Not enabled for this checkout
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-4 px-6 py-6 text-left opacity-65">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm dark:bg-white/5 dark:text-slate-500">
                      <CreditCard className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block font-black text-slate-700 dark:text-slate-300">Wallet</span>
                      <span className="mt-1 block text-xs font-bold text-slate-500 dark:text-slate-500">
                        UPI and cards recommended
                      </span>
                    </span>
                  </div>
                </div>

                <div className="p-6 sm:p-8">
                  <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <h3 className="text-lg font-black text-slate-950 dark:text-white">Pay inside Razorpay checkout</h3>
                      <p className="mt-2 max-w-md text-sm font-medium leading-6 text-slate-600 dark:text-slate-400">
                        We create an order first, then Razorpay shows order-bound UPI, QR, and card options. This keeps your payment linked to your workspace.
                      </p>
                    </div>
                    <div className="flex w-fit items-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
                      {["G Pay", "PhonePe", "Paytm", "BHIM"].map((app) => (
                        <span key={app} className="border-r border-slate-200 px-3 py-2 text-xs font-black text-slate-600 last:border-r-0 dark:border-white/10 dark:text-slate-300">
                          {app}
                        </span>
                      ))}
                      <span className="px-3 py-2 text-sm font-black text-slate-500 dark:text-slate-400" aria-hidden="true">
                        ...
                      </span>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/30 sm:p-7">
                    <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
                      <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-[2rem] border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 shadow-[0_20px_60px_rgba(15,23,42,0.10)] dark:border-blue-400/20 dark:from-blue-500/10 dark:via-slate-950 dark:to-cyan-400/10">
                        <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-[#145DFF] to-[#0B3FCC] text-white shadow-[0_24px_70px_rgba(20,93,255,0.35)]">
                          <QrCode className="h-12 w-12" />
                          <span className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white text-[#145DFF] shadow-lg">
                            <Lock className="h-4 w-4" />
                          </span>
                        </div>
                      </div>

                      <div className="space-y-5">
                        <h4 className="text-lg font-black text-slate-950 dark:text-white">Order-bound payment</h4>
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                            <QrCode className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                            Razorpay generates the QR after your order is created
                          </div>
                          <div className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                            <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                            UPI, app, and card payments stay inside the secure popup
                          </div>
                          <div className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                            <IndianRupee className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                            Amount locked to {amountLabel}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center">
                        <div>
                          <p className="text-sm font-black text-slate-900 dark:text-white">Ready to pay {amountLabel}</p>
                          <p className="mt-1 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
                            Complete payment only in the Razorpay popup so activation can be verified automatically.
                          </p>
                        </div>
                      <button
                        type="submit"
                        disabled={isProcessing}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#145DFF] to-[#0B3FCC] px-5 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        <Lock className="h-4 w-4" />
                        {isProcessing ? "Opening..." : "Pay Now"}
                      </button>
                      </div>
                    </div>
                    <p className="mt-2 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
                      Direct UPI transfers are not supported for plan activation because they cannot be safely linked to your workspace.
                    </p>
                  </div>

                  <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/80 p-4 dark:border-blue-400/20 dark:bg-blue-500/10">
                    <div className="flex gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm dark:bg-white/10 dark:text-blue-300">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-blue-700 dark:text-blue-200">Your payment details are safe and secure.</p>
                        <p className="mt-1 text-xs font-medium leading-5 text-slate-600 dark:text-slate-400">
                          Adviso AI only receives payment identifiers required for server-side verification.
                        </p>
                      </div>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-600 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-300">
                      {errorMessage}
                    </div>
                  )}
                  {checkoutMessage && !errorMessage && (
                    <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold leading-6 text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200">
                      {checkoutMessage}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 border-t border-slate-200 px-6 py-6 dark:border-white/10 sm:grid-cols-3 sm:px-8">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                  <div>
                    <p className="text-sm font-black text-slate-800 dark:text-white">Instant activation</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Access after payment</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                  <div>
                    <p className="text-sm font-black text-slate-800 dark:text-white">Secure checkout</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Protected by Razorpay</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <HelpCircle className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                  <div>
                    <p className="text-sm font-black text-slate-800 dark:text-white">24/7 support</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">We are here to help</p>
                  </div>
                </div>
              </div>
            </form>
          </motion.div>
        </div>

        <p className="mt-8 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
