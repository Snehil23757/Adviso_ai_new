import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Key,
  Linkedin,
  Lock,
  Mail,
  Moon,
  Shield,
  ShieldCheck,
  Sun,
  User,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import loginDarkImage from "../assets/login_dark.png";
import loginScreenImage from "../assets/login_screen_img.png";
import { useAuth } from "../lib/AuthContext.tsx";
import Logo from "./Logo.tsx";

type ThemeMode = "light" | "dark";
type AuthMode = "login" | "register" | "forgot";

interface AuthPageProps {
  initialMode: "login" | "register";
  onSuccess: () => void;
  onBack: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

function authErrorMessage(error: unknown, mode: AuthMode) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
  const rawMessage = error instanceof Error ? error.message : "";

  if (
    code.includes("invalid-credential") ||
    code.includes("wrong-password") ||
    code.includes("user-not-found") ||
    code.includes("invalid-login-credentials") ||
    rawMessage.toLowerCase().includes("invalid-credential")
  ) {
    return "Invalid email or password.";
  }
  if (code.includes("email-already-in-use")) {
    return "An account already exists for this email.";
  }
  if (code.includes("weak-password")) {
    return "Please use a stronger password.";
  }
  if (code.includes("invalid-email")) {
    return "Please enter a valid email address.";
  }
  if (code.includes("too-many-requests")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (code.includes("popup-closed") || code.includes("cancelled-popup-request")) {
    return "Sign-in was cancelled.";
  }
  if (code.includes("network-request-failed")) {
    return "Network error. Check your connection and try again.";
  }
  if (code.includes("operation-not-allowed") || rawMessage.toLowerCase().includes("not available")) {
    return "Secure sign-in is not available right now. Please contact support.";
  }
  if (rawMessage && !rawMessage.toLowerCase().includes("firebase")) {
    return rawMessage;
  }

  if (mode === "register") return "We could not create your account. Please check your details and try again.";
  if (mode === "forgot") return "We could not send a reset link. Please check the email and try again.";
  return "We could not sign you in. Please check your details and try again.";
}

export default function AuthPage({ initialMode, onSuccess, onBack, theme, onToggleTheme }: AuthPageProps) {
  const { authReady, signInEmail, registerEmail, signInGoogle, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const isDark = theme === "dark";

  const resetUi = () => {
    setError("");
    setNotice("");
  };

  const switchMode = (nextMode: AuthMode) => {
    resetUi();
    setMode(nextMode);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    resetUi();

    if (!authReady) {
      setError("Secure sign-in is not available right now. Please contact support.");
      return;
    }
    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "forgot") {
        await resetPassword(email);
        setNotice("Password reset email sent. Check your inbox and spam folder.");
        return;
      }

      if (mode === "register") {
        await registerEmail(fullName.trim(), email.trim(), password);
        setNotice("Account created. A verification email has been sent to your inbox.");
      } else {
        await signInEmail(email.trim(), password);
      }
      onSuccess();
    } catch (err) {
      setError(authErrorMessage(err, mode));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    resetUi();
    if (!authReady) {
      setError("Secure sign-in is not available right now. Please contact support.");
      return;
    }
    setIsSubmitting(true);
    try {
      await signInGoogle();
      onSuccess();
    } catch (err) {
      setError(authErrorMessage(err, mode));
    } finally {
      setIsSubmitting(false);
    }
  };

  const visualImage = isDark ? loginDarkImage : loginScreenImage;
  const pageClass = isDark ? "bg-[#040b17] text-slate-50" : "bg-[#f7fbff] text-slate-950";
  const panelBorder = isDark ? "border-white/10" : "border-slate-200/80";
  const mutedText = isDark ? "text-slate-400" : "text-slate-500";
  const cardClass = isDark
    ? "border-white/10 bg-[rgba(11,20,36,0.86)] shadow-[0_32px_120px_rgba(0,0,0,0.38)]"
    : "border-slate-200/80 bg-white/90 shadow-[0_32px_120px_rgba(15,23,42,0.12)]";
  const inputClass = isDark
    ? "border-white/10 bg-white/[0.04] text-slate-50 placeholder:text-slate-500 focus:border-blue-400 focus:ring-blue-400/15"
    : "border-slate-200 bg-white text-slate-950 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/10";
  const secondaryButtonClass = isDark
    ? "border-white/10 bg-white/[0.04] text-slate-100 hover:border-blue-400/40 hover:bg-white/[0.07]"
    : "border-slate-200 bg-white text-slate-800 hover:border-blue-200 hover:bg-blue-50";
  const formTitle =
    mode === "login" ? "Sign in to your workspace" : mode === "register" ? "Create your workspace" : "Reset your password";
  const formSubtitle =
    mode === "login"
      ? "Enter your credentials to access your dashboard"
      : mode === "register"
        ? "Create a secure Adviso AI workspace in minutes"
        : "We will send a secure reset link to your email";
  const actionText =
    isSubmitting
      ? "Processing..."
      : mode === "login"
        ? "Sign in"
        : mode === "register"
          ? "Create account"
          : "Send reset link";
  const panelTransition = { duration: 0.78, ease: [0.16, 1, 0.3, 1] } as const;
  const itemTransition = { duration: 0.58, ease: [0.16, 1, 0.3, 1] } as const;

  const featureItems = [
    {
      icon: Shield,
      title: "Enterprise grade security",
      text: "Your data is protected with encrypted authentication and managed access.",
      tone: "text-blue-500 bg-blue-500/10 border-blue-400/20",
    },
    {
      icon: Zap,
      title: "Real-time intelligence",
      text: "Continue into dashboards, scenarios, and predictive workspace insights.",
      tone: "text-emerald-500 bg-emerald-500/10 border-emerald-400/20",
    },
    {
      icon: User,
      title: "Built for teams",
      text: "Collaborate safely across business users, analysts, and founders.",
      tone: "text-violet-500 bg-violet-500/10 border-violet-400/20",
    },
  ];

  const trustItems = [
    { icon: ShieldCheck, label: "SOC 2 Type II", sub: "Compliant" },
    { icon: Lock, label: "256-bit SSL", sub: "Encrypted" },
    { icon: CheckCircle, label: "99.9%", sub: "Uptime" },
  ];

  return (
    <div className={`min-h-screen selection:bg-blue-500/20 ${pageClass}`}>
      <div className="grid min-h-screen lg:grid-cols-[54%_46%]">
        <motion.section
          className={`relative hidden min-h-screen overflow-hidden border-r ${panelBorder} lg:flex`}
          initial={{ opacity: 0, x: -44 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -28 }}
          transition={panelTransition}
        >
          <motion.img
            src={visualImage}
            alt="Adviso AI secure intelligence workspace"
            className="absolute inset-0 h-full w-full object-cover object-center"
            initial={{ scale: 1.05 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.25, ease: [0.16, 1, 0.3, 1] }}
            fetchPriority="high"
            decoding="async"
          />
          <div
            className={
              isDark
                ? "absolute inset-0 bg-[linear-gradient(90deg,rgba(4,11,23,0.96)_0%,rgba(4,11,23,0.78)_35%,rgba(4,11,23,0.2)_100%)]"
                : "absolute inset-0 bg-[linear-gradient(90deg,rgba(247,251,255,0.96)_0%,rgba(247,251,255,0.78)_35%,rgba(247,251,255,0.18)_100%)]"
            }
          />
          <div className={isDark ? "absolute inset-0 bg-[radial-gradient(circle_at_70%_28%,rgba(20,93,255,0.18),transparent_32%)]" : "absolute inset-0 bg-[radial-gradient(circle_at_70%_26%,rgba(20,93,255,0.12),transparent_32%)]"} />

          <div className="relative z-10 flex min-h-screen w-full flex-col px-10 py-8 xl:px-14">
            <motion.button
              onClick={onBack}
              className="w-fit"
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, ...itemTransition }}
              whileHover={{ x: -2 }}
            >
              <Logo size="lg" className={isDark ? "text-white" : "text-slate-950"} />
            </motion.button>

            <div className="flex flex-1 flex-col justify-center">
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.12 } },
                }}
                className="max-w-xl"
              >
                <motion.h1
                  className={`text-5xl font-black leading-[1.05] tracking-tight xl:text-6xl ${isDark ? "text-white" : "text-slate-950"}`}
                  variants={{
                    hidden: { opacity: 0, y: 22, filter: "blur(8px)" },
                    visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: itemTransition },
                  }}
                >
                  Welcome back to{" "}
                  <span className="block bg-gradient-to-r from-[#145DFF] via-[#2c82ff] to-[#20D7FF] bg-clip-text text-transparent">
                    Adviso AI
                  </span>
                </motion.h1>
                <motion.p
                  className={`mt-6 max-w-md text-base font-medium leading-8 ${isDark ? "text-slate-300" : "text-slate-600"}`}
                  variants={{
                    hidden: { opacity: 0, y: 18 },
                    visible: { opacity: 1, y: 0, transition: itemTransition },
                  }}
                >
                  Access your intelligence workspace and continue building data-driven strategies that drive impact.
                </motion.p>

                <motion.div
                  className="mt-10 space-y-6"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
                  }}
                >
                  {featureItems.map((item) => {
                    const FeatureIcon = item.icon;
                    return (
                      <motion.div
                        key={item.title}
                        className="flex max-w-md gap-5"
                        variants={{
                          hidden: { opacity: 0, x: -22 },
                          visible: { opacity: 1, x: 0, transition: itemTransition },
                        }}
                      >
                        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${item.tone}`}>
                          <FeatureIcon className="h-7 w-7" />
                        </div>
                        <div>
                          <h3 className={isDark ? "font-black text-white" : "font-black text-slate-950"}>{item.title}</h3>
                          <p className={`mt-1 text-sm font-medium leading-6 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                            {item.text}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </motion.div>
            </div>

            <motion.div
              className={`grid gap-4 rounded-2xl border p-5 backdrop-blur-xl sm:grid-cols-3 ${isDark ? "border-white/10 bg-white/[0.04]" : "border-slate-200/80 bg-white/70"}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42, ...itemTransition }}
            >
              {trustItems.map((item) => {
                const TrustIcon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <TrustIcon className="h-6 w-6 text-blue-500" />
                    <div>
                      <p className={`text-sm font-black ${isDark ? "text-white" : "text-slate-950"}`}>{item.label}</p>
                      <p className={`text-xs font-medium ${mutedText}`}>{item.sub}</p>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </div>
        </motion.section>

        <motion.section
          className={
            isDark
              ? "relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_48%_20%,rgba(20,93,255,0.18),transparent_34%),#040b17] px-5 py-20"
              : "relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_48%_20%,rgba(20,93,255,0.1),transparent_34%),#f7fbff] px-5 py-20"
          }
          initial={{ opacity: 0, x: 44 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 28 }}
          transition={panelTransition}
        >
          <img
            src={visualImage}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover object-center lg:hidden ${isDark ? "opacity-[0.18]" : "opacity-20"}`}
            aria-hidden="true"
          />
          <div className={isDark ? "absolute inset-0 bg-[#040b17]/84 lg:hidden" : "absolute inset-0 bg-white/72 lg:hidden"} />

          <button
            onClick={onBack}
            className={`absolute left-5 top-6 z-20 inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-black transition md:left-10 md:top-10 ${
              isDark ? "text-slate-300 hover:bg-white/[0.06] hover:text-white" : "text-slate-600 hover:bg-white hover:text-slate-950"
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to website
          </button>

          <button
            onClick={onToggleTheme}
            className={`absolute right-5 top-6 z-20 inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-black shadow-sm transition md:right-10 md:top-10 ${
              isDark
                ? "border-white/10 bg-white/[0.06] text-white hover:border-blue-400/45"
                : "border-slate-200 bg-white text-slate-700 hover:border-blue-200"
            }`}
            aria-label="Toggle login theme"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {isDark ? "Light mode" : "Dark mode"}
          </button>

          <div className="relative z-10 w-full max-w-[540px]">
            <div className="mb-8 lg:hidden">
              <Logo size="lg" className={isDark ? "text-white" : "text-slate-950"} />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: mode === "register" ? 26 : -26, filter: "blur(8px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: mode === "register" ? -26 : 26, filter: "blur(8px)" }}
                transition={itemTransition}
                className={`rounded-[2rem] border p-7 backdrop-blur-2xl sm:p-10 ${cardClass}`}
              >
                <div className="mb-8">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#145DFF] to-[#0B3FCC] text-white shadow-lg shadow-blue-600/25">
                    <Lock className="h-8 w-8" />
                  </div>
                  <h2 className={`text-3xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
                    {formTitle}
                  </h2>
                  <p className={`mt-3 text-base font-medium ${mutedText}`}>{formSubtitle}</p>
                </div>

                {mode !== "forgot" && (
                  <>
                    <div className="mb-6 flex items-center gap-4">
                      <div className={`h-px flex-1 ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
                      <span className={`font-mono text-[10px] font-black uppercase tracking-[0.22em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                        Or continue with
                      </span>
                      <div className={`h-px flex-1 ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
                    </div>

                    <div className="mb-6 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={handleGoogle}
                        disabled={isSubmitting || !authReady}
                        className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-black shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${secondaryButtonClass}`}
                      >
                        <span className="text-base font-black text-blue-500">G</span>
                        Google
                      </button>
                      <div className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-black opacity-60 ${secondaryButtonClass}`}>
                        <Linkedin className="h-4 w-4 text-blue-500" />
                        LinkedIn
                      </div>
                    </div>
                  </>
                )}

                <motion.form onSubmit={handleSubmit} className="space-y-5" layout>
                  {mode === "register" && (
                    <label className="block">
                      <span className={`mb-2 block text-sm font-black ${isDark ? "text-slate-300" : "text-slate-700"}`}>Full name</span>
                      <div className="relative">
                        <User className={`absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${mutedText}`} />
                        <input
                          type="text"
                          value={fullName}
                          onChange={(event) => setFullName(event.target.value)}
                          required
                          placeholder="Jane Doe"
                          className={`h-14 w-full rounded-xl border py-0 pl-12 pr-4 text-sm font-semibold outline-none transition focus:ring-4 ${inputClass}`}
                        />
                      </div>
                    </label>
                  )}

                  <label className="block">
                    <span className={`mb-2 block text-sm font-black ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                      {mode === "register" ? "Email address" : "Corporate email"}
                    </span>
                    <div className="relative">
                      <Mail className={`absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${mutedText}`} />
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                        placeholder="name@company.com"
                        className={`h-14 w-full rounded-xl border py-0 pl-12 pr-4 text-sm font-semibold outline-none transition focus:ring-4 ${inputClass}`}
                      />
                    </div>
                  </label>

                  {mode !== "forgot" && (
                    <label className="block">
                      <span className={`mb-2 flex items-center justify-between text-sm font-black ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        Password
                        {mode === "login" && (
                          <button
                            type="button"
                            onClick={() => switchMode("forgot")}
                            className="text-xs font-black text-blue-500 hover:underline"
                          >
                            Forgot password?
                          </button>
                        )}
                      </span>
                      <div className="relative">
                        <Key className={`absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${mutedText}`} />
                        <input
                          type="password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          required
                          minLength={8}
                          placeholder="At least 8 characters"
                          className={`h-14 w-full rounded-xl border py-0 pl-12 pr-4 text-sm font-semibold outline-none transition focus:ring-4 ${inputClass}`}
                        />
                      </div>
                    </label>
                  )}

                  {mode === "register" && (
                    <label className="block">
                      <span className={`mb-2 block text-sm font-black ${isDark ? "text-slate-300" : "text-slate-700"}`}>Confirm password</span>
                      <div className="relative">
                        <Lock className={`absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${mutedText}`} />
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          required
                          minLength={8}
                          placeholder="Repeat password"
                          className={`h-14 w-full rounded-xl border py-0 pl-12 pr-4 text-sm font-semibold outline-none transition focus:ring-4 ${inputClass}`}
                        />
                      </div>
                    </label>
                  )}

                  {mode === "login" && (
                    <div className="flex items-center justify-between">
                      <label className={`flex items-center gap-3 text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(event) => setRememberMe(event.target.checked)}
                          className="h-4 w-4 rounded border-blue-300 accent-blue-600"
                        />
                        Remember me
                      </label>
                      <button
                        type="button"
                        onClick={() => setNotice("For help, email support@adviso.ai from your registered account.")}
                        className="text-sm font-black text-blue-500 hover:underline"
                      >
                        Need help?
                      </button>
                    </div>
                  )}

                  {error && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-500">
                      {error}
                    </div>
                  )}
                  {notice && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-500">
                      {notice}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || !authReady}
                    className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#145DFF] to-[#0B3FCC] text-sm font-black text-white shadow-[0_18px_42px_rgba(20,93,255,0.34)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {actionText}
                    {!isSubmitting && <ArrowRight className="h-4 w-4" />}
                  </button>
                </motion.form>

                {!authReady && (
                  <div className={`mt-5 rounded-xl border px-4 py-3 text-xs leading-5 ${isDark ? "border-amber-500/30 bg-amber-500/10 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                    Secure sign-in is not available right now. Please contact support.
                  </div>
                )}

                <div className={`mt-8 text-center text-sm font-medium ${mutedText}`}>
                  {mode === "login" ? (
                    <p>
                      Do not have a workspace?{" "}
                      <button onClick={() => switchMode("register")} className="font-black text-blue-500 hover:underline">
                        Request access
                      </button>
                    </p>
                  ) : mode === "register" ? (
                    <p>
                      Already have a workspace?{" "}
                      <button onClick={() => switchMode("login")} className="font-black text-blue-500 hover:underline">
                        Sign in
                      </button>
                    </p>
                  ) : (
                    <p>
                      Remembered your password?{" "}
                      <button onClick={() => switchMode("login")} className="font-black text-blue-500 hover:underline">
                        Back to sign in
                      </button>
                    </p>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            <div className={`mx-auto mt-8 flex max-w-md items-start justify-center gap-3 text-center text-xs leading-5 ${mutedText}`}>
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
              <span>
                By continuing, you agree to the Enterprise License Agreement and Adviso AI workspace terms of service.
              </span>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
