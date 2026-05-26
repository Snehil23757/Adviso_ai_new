import React, { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle, Key, Mail, Moon, ShieldCheck, Sun } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import favAdv from "../assets/fav_adv.png";
import loginScreenImage from "../assets/login_screen_img.png";
import { useAuth } from "../lib/AuthContext.tsx";

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

  const pageClass = isDark ? "bg-[#080d18] text-slate-50" : "bg-[#fbfdff] text-slate-950";
  const panelBorder = isDark ? "border-slate-800" : "border-slate-200/80";
  const mutedText = isDark ? "text-slate-400" : "text-slate-500";
  const inputClass = isDark
    ? "border-slate-700 bg-slate-900/80 text-slate-50 placeholder:text-slate-500 focus:border-blue-400 focus:ring-blue-400/15"
    : "border-slate-200 bg-white text-slate-950 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/10";
  const secondaryButtonClass = isDark
    ? "border-slate-700 bg-slate-900/80 text-slate-100 hover:border-blue-500/60 hover:bg-slate-900"
    : "border-slate-200 bg-white text-slate-800 hover:border-blue-200 hover:bg-blue-50";
  const panelTransition = { duration: 0.72, ease: [0.22, 1, 0.36, 1] } as const;
  const contentTransition = { duration: 0.46, ease: [0.22, 1, 0.36, 1] } as const;

  return (
    <div className={`min-h-screen selection:bg-blue-500/20 ${pageClass}`}>
      <div className="grid min-h-screen lg:grid-cols-[52%_48%]">
        <motion.section
          className={`relative hidden overflow-hidden border-r ${panelBorder} lg:block`}
          initial={{ opacity: 0, x: -44 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -28 }}
          transition={panelTransition}
        >
          <motion.img
            src={loginScreenImage}
            alt="Adviso AI strategic workspace illustration"
            className={`absolute inset-0 h-full w-full object-cover object-center ${isDark ? "opacity-50" : "opacity-95"}`}
            initial={{ scale: 1.06 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          />
          <div
            className={
              isDark
                ? "absolute inset-0 bg-[linear-gradient(90deg,rgba(8,13,24,0.95)_0%,rgba(8,13,24,0.72)_36%,rgba(8,13,24,0.35)_100%)]"
                : "absolute inset-0 bg-[linear-gradient(90deg,rgba(248,251,255,0.92)_0%,rgba(248,251,255,0.74)_34%,rgba(248,251,255,0.12)_100%)]"
            }
          />

          <motion.button
            onClick={onBack}
            className="absolute left-12 top-10 z-20 flex items-center gap-3"
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, ...contentTransition }}
            whileHover={{ x: -2 }}
          >
            <img src={favAdv} alt="Adviso AI" className="h-10 w-10 rounded-lg object-cover mix-blend-multiply" />
            <span className={`text-xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
              Adviso <span className="text-blue-500">AI</span>
            </span>
          </motion.button>

          <div className="relative z-10 flex min-h-screen flex-col justify-center px-12 xl:px-16">
            <motion.div
              className="max-w-[460px] space-y-5"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.12, delayChildren: 0.12 } },
              }}
            >
              <h1 className={`text-4xl font-black leading-[1.08] tracking-tight xl:text-5xl ${isDark ? "text-white" : "text-slate-950"}`}>
                <motion.span
                  className="block"
                  variants={{
                    hidden: { opacity: 0, x: -36, filter: "blur(6px)" },
                    visible: { opacity: 1, x: 0, filter: "blur(0px)", transition: contentTransition },
                  }}
                >
                  Initialize Your
                </motion.span>
                <motion.span
                  className="block text-blue-500"
                  variants={{
                    hidden: { opacity: 0, x: 36, filter: "blur(6px)" },
                    visible: { opacity: 1, x: 0, filter: "blur(0px)", transition: contentTransition },
                  }}
                >
                  Strategic Workspace
                </motion.span>
              </h1>
              <motion.p
                className={`max-w-[420px] text-base font-medium leading-8 ${isDark ? "text-slate-300" : "text-slate-600"}`}
                variants={{
                  hidden: { opacity: 0, y: 18 },
                  visible: { opacity: 1, y: 0, transition: contentTransition },
                }}
              >
                Access a secure workspace for analytics, AI insights, credits, and subscription-aware execution.
              </motion.p>
            </motion.div>

            <motion.div
              className={`absolute bottom-10 left-12 flex items-center gap-8 text-xs font-mono font-semibold xl:left-16 ${isDark ? "text-slate-300" : "text-slate-500"}`}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.48, ...contentTransition }}
            >
              {["Secure Sign-In", "Verified Sessions", "Protected AI Access"].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-500" /> {item}
                </span>
              ))}
            </motion.div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, x: 44 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 28 }}
          transition={panelTransition}
          className={
            isDark
              ? "relative flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_50%_18%,rgba(59,130,246,0.16),transparent_34%),#080d18] px-6 py-20"
              : "relative flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_50%_20%,rgba(59,130,246,0.08),transparent_34%),#fbfdff] px-6 py-20"
          }
        >
          <motion.button
            onClick={onBack}
            className={`absolute left-6 top-6 flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-bold transition md:left-10 md:top-10 ${
              isDark ? "text-slate-400 hover:bg-slate-900 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            }`}
            whileHover={{ x: -3 }}
            whileTap={{ scale: 0.98 }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Website
          </motion.button>

          <motion.button
            onClick={onToggleTheme}
            className={`absolute right-6 top-6 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-black transition md:right-10 md:top-10 ${
              isDark ? "border-slate-700 bg-slate-900 text-slate-100 hover:border-blue-500/60" : "border-slate-200 bg-white text-slate-700 hover:border-blue-200"
            }`}
            aria-label="Toggle login theme"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {isDark ? "Light" : "Dark"}
          </motion.button>

          <div className="w-full max-w-[440px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: mode === "register" ? 28 : -28, filter: "blur(8px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: mode === "register" ? -28 : 28, filter: "blur(8px)" }}
                transition={contentTransition}
              >
            <div className="mb-8">
              <div className="mb-7 flex items-center gap-3 lg:hidden">
                <img src={favAdv} alt="Adviso AI" className="h-10 w-10 rounded-lg object-cover mix-blend-multiply" />
                <span className={`text-xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
                  Adviso <span className="text-blue-500">AI</span>
                </span>
              </div>
              <h2 className={`text-3xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
                {mode === "login" ? "Welcome back" : mode === "register" ? "Create your account" : "Reset password"}
              </h2>
              <p className={`mt-3 text-sm font-medium ${mutedText}`}>
                {mode === "login"
                  ? "Sign in to access your intelligence console"
                  : mode === "register"
                    ? "Use any valid email address or continue with Google"
                    : "Enter your account email and we will send a reset link"}
              </p>
            </div>

            <motion.button
              type="button"
              onClick={handleGoogle}
              disabled={isSubmitting || !authReady}
              className={`mb-6 flex h-12 w-full items-center justify-center gap-3 rounded-xl border text-sm font-black shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${secondaryButtonClass}`}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.985 }}
            >
              <span className="text-base font-black text-blue-500">G</span>
              {mode === "register" ? "Sign up with Google" : "Continue with Google"}
            </motion.button>

            <div className="mb-6 flex items-center gap-4">
              <div className={`h-px flex-1 ${isDark ? "bg-slate-800" : "bg-slate-200"}`} />
              <span className={`font-mono text-[10px] font-black uppercase tracking-[0.16em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                Or use email
              </span>
              <div className={`h-px flex-1 ${isDark ? "bg-slate-800" : "bg-slate-200"}`} />
            </div>

            <motion.form onSubmit={handleSubmit} className="space-y-5" layout>
              {mode === "register" && (
                <label className="block">
                  <span className={`mb-2 block font-mono text-[11px] font-black uppercase tracking-[0.14em] ${mutedText}`}>Full Name</span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    required
                    placeholder="Jane Doe"
                    className={`h-14 w-full rounded-xl px-4 text-sm font-semibold shadow-sm outline-none transition focus:ring-4 ${inputClass}`}
                  />
                </label>
              )}

              <label className="block">
                <span className={`mb-2 flex items-center gap-2 font-mono text-[11px] font-black uppercase tracking-[0.14em] ${mutedText}`}>
                  <Mail className="h-3.5 w-3.5" />
                  Email Address
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  placeholder="name@company.com"
                  className={`h-14 w-full rounded-xl px-4 text-sm font-semibold shadow-sm outline-none transition focus:ring-4 ${inputClass}`}
                />
              </label>

              {mode !== "forgot" && (
                <label className="block">
                  <span className={`mb-2 flex items-center justify-between font-mono text-[11px] font-black uppercase tracking-[0.14em] ${mutedText}`}>
                    <span className="flex items-center gap-2"><Key className="h-3.5 w-3.5" /> Password</span>
                    {mode === "login" && (
                      <button type="button" onClick={() => switchMode("forgot")} className="font-sans text-xs font-bold normal-case tracking-normal text-blue-500 hover:underline">
                        Forgot password?
                      </button>
                    )}
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                    className={`h-14 w-full rounded-xl px-4 text-sm font-semibold shadow-sm outline-none transition focus:ring-4 ${inputClass}`}
                  />
                </label>
              )}

              {mode === "register" && (
                <label className="block">
                  <span className={`mb-2 block font-mono text-[11px] font-black uppercase tracking-[0.14em] ${mutedText}`}>Confirm Password</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    minLength={8}
                    placeholder="Repeat password"
                    className={`h-14 w-full rounded-xl px-4 text-sm font-semibold shadow-sm outline-none transition focus:ring-4 ${inputClass}`}
                  />
                </label>
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

              <motion.button
                type="submit"
                disabled={isSubmitting || !authReady}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-black text-white shadow-[0_16px_34px_rgba(37,99,235,0.28)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.985 }}
              >
                {isSubmitting
                  ? "Processing..."
                  : mode === "login"
                    ? "Sign In"
                    : mode === "register"
                      ? "Create Account"
                    : "Send Reset Link"}
                {!isSubmitting && <ArrowRight className="h-4 w-4" />}
              </motion.button>
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
                    Create account
                  </button>
                </p>
              ) : mode === "register" ? (
                <p>
                  Already initialized?{" "}
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

            <div className={`mx-auto mt-10 flex max-w-sm items-start justify-center gap-2 text-center text-xs leading-5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
              <span>Your credentials are protected by encrypted, managed authentication. Adviso AI never stores plaintext passwords.</span>
            </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
