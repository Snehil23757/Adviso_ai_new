import React, { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, CreditCard, IndianRupee, Lock, QrCode, ShieldCheck, Smartphone } from "lucide-react";
import { motion } from "motion/react";

import { apiFailureMessage, authorizedFetch, readApiJson } from "../config";
import razorpayUpiQr from "../assets/images/razorpay_upi_qr.jpeg";
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
  if (/cancelled/i.test(message)) return "Payment was cancelled before completion.";
  return message;
}

export default function PaymentCheckout({ plan, onBack, onCancel, onComplete }: PaymentCheckoutProps) {
  const { profile, user } = useAuth();
  const { refreshSubscription } = usePermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [paymentId, setPaymentId] = useState("");

  const targetPlanId = useMemo(() => plan.id || planIdFromName(plan.name), [plan.id, plan.name]);
  const amountPaise = validAmountPaise(plan.amountPaise);
  const amountLabel = amountPaise ? formatInrFromPaise(amountPaise) : "Unavailable";
  const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID || "";

  const verifyPayment = async (response: RazorpaySuccessResponse) => {
    const verifyResponse = await authorizedFetch("/api/verify-payment", {
      method: "POST",
      body: JSON.stringify(response),
    });
    const verification = await readApiJson<VerifyPaymentResponse>(verifyResponse);
    if (!verification.success) throw new Error("Payment verification failed.");
    setPaymentId(verification.payment_id);
    await refreshSubscription({ notify: true });
    setSuccess(true);
  };

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
            ondismiss: () => reject(new Error("Payment was cancelled before completion.")),
          },
          handler: (paymentResponse) => {
            verifyPayment(paymentResponse)
              .then(resolve)
              .catch(reject);
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
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-brand-background flex items-center justify-center p-6 text-brand-text-primary selection:bg-brand-primary/30 transition-colors duration-500">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-brand-surface border border-emerald-500/30 p-8 rounded-3xl text-center space-y-6 relative overflow-hidden shadow-2xl"
        >
          <div className="absolute inset-0 bg-emerald-500/5 pulse" />
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-brand-text-primary mb-2">Payment Successful</h2>
            <p className="text-brand-text-secondary text-sm">
              Your {plan.name} subscription is verified and active for this workspace.
            </p>
            {paymentId && (
              <p className="text-[11px] font-mono text-brand-text-secondary mt-3 break-all">
                Payment ID: {paymentId}
              </p>
            )}
          </div>
          <button onClick={onComplete || onBack} className="w-full bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5 transition-transform">
            Go to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070d1b] flex text-white selection:bg-blue-500/30 w-full relative overflow-hidden transition-colors duration-500">
      <div className="absolute inset-0 subtle-grid opacity-15 pointer-events-none" />
      <div className="absolute -top-32 right-[-12%] h-[520px] w-[720px] rounded-full bg-blue-500/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-28%] left-[-16%] h-[620px] w-[620px] rounded-full bg-cyan-400/5 blur-[150px] pointer-events-none" />

      <div className="w-full max-w-[1500px] mx-auto px-6 md:px-12 xl:px-20 flex flex-col pt-8 lg:pt-0 relative z-10">
        <header className="h-24 flex items-center justify-between w-full relative z-20 shrink-0">
          <button
            onClick={onCancel || onBack}
            className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
          <div className="flex items-center">
            <Logo size="md" className="text-white" />
          </div>
        </header>

        <div className="flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 items-center min-h-[calc(100vh-6rem)] py-12 lg:py-0">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-6 xl:col-span-5 flex flex-col space-y-8"
          >
            <div className="space-y-4">
              <span className="text-xs font-mono text-blue-400 font-bold uppercase tracking-widest bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-400/20 inline-block">
                UPI + Card Checkout
              </span>
              <h1 className="text-4xl lg:text-6xl font-black tracking-tight leading-tight">
                Pay with UPI <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">or test card</span>
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed max-w-md">
                Open a secure Razorpay checkout session, scan the QR code, choose a UPI app, or enter Razorpay test card details. Your plan unlocks only after server-side verification.
              </p>
            </div>

            <div className="bg-slate-900/70 border border-slate-700/70 rounded-3xl p-8 space-y-6 shadow-2xl shadow-black/20">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-white">{plan.name} Plan</h3>
                  <p className="text-sm text-slate-400 mt-1">UPI or card secure test payment.</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-white">{amountLabel}</div>
                  <div className="text-xs text-slate-500 mt-1 tracking-widest uppercase font-mono">INR</div>
                </div>
              </div>

              <div className="w-full h-px bg-slate-700/80" />

              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-3 text-sm text-slate-100 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-blue-400" /> UPI QR, UPI app, and card checkout
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-100 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-blue-400" /> No netbanking options requested
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-100 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-blue-400" /> Plan activates after payment verification
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400 p-4 rounded-2xl border border-slate-700/60 bg-slate-900/50">
              <ShieldCheck className="w-8 h-8 text-emerald-500 shrink-0" />
              <p className="leading-relaxed">
                Test mode is active. Use Razorpay UPI or card test details in the checkout modal to complete the transaction.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg:col-span-6 xl:col-span-7 flex justify-end"
          >
            <div className="w-full max-w-xl bg-slate-900/72 border border-slate-700/80 p-8 sm:p-12 rounded-[2rem] shadow-2xl shadow-black/30 relative">
              <form onSubmit={startCheckout} className="relative z-10 space-y-8">
                <div className="space-y-4">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono block">
                    Payment Gateway
                  </label>
                  <div className="rounded-2xl border border-blue-400/30 bg-blue-500/10 p-5 flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0">
                      <QrCode className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">UPI QR, App, and Card Checkout</h3>
                      <p className="text-sm text-slate-400 mt-1 leading-6">
                        Razorpay opens checkout with UPI and card options. Adviso AI verifies the payment signature before activating the plan.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-[170px_minmax(0,1fr)] gap-5 items-center rounded-2xl border border-slate-700/70 bg-slate-950/40 p-5">
                  <div className="mx-auto w-40 overflow-hidden rounded-2xl bg-white shadow-2xl shadow-blue-500/10 ring-1 ring-white/10">
                    <img
                      src={razorpayUpiQr}
                      alt="Razorpay UPI QR code for Adviso AI"
                      className="block h-auto w-full"
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-sm font-bold text-white">
                      <Smartphone className="w-5 h-5 text-blue-400" />
                      Scan the QR from any UPI app
                    </div>
                    <div className="flex items-center gap-3 text-sm font-bold text-white">
                      <CreditCard className="w-5 h-5 text-blue-400" />
                      Or enter Razorpay test card details
                    </div>
                    <div className="flex items-center gap-3 text-sm font-bold text-white">
                      <IndianRupee className="w-5 h-5 text-emerald-400" />
                      Amount locked to {amountLabel}
                    </div>
                    <p className="text-xs text-slate-500 leading-5">
                      For automatic plan activation, complete the checkout flow from the button below so Adviso AI receives verified payment confirmation.
                    </p>
                  </div>
                </div>

                {errorMessage && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500 leading-6">
                    {errorMessage}
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full h-14 bg-blue-500 text-white font-bold text-base rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-600 hover:-translate-y-0.5 active:translate-y-0 transition-transform flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed group"
                  >
                    <span className="flex items-center gap-2">
                      <Lock className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      {isProcessing ? "Opening checkout..." : `Open Checkout - ${amountLabel}`}
                    </span>
                  </button>
                </div>

                <p className="text-center text-xs text-slate-500 pt-4 leading-relaxed max-w-sm mx-auto">
                  Payment authentication happens inside Razorpay checkout. Adviso AI only receives the payment identifiers needed for verification.
                </p>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
