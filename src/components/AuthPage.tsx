import React, { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle, Moon, ShieldCheck, Sun } from "lucide-react";
import favAdv from "../assets/fav_adv.png";
import loginScreenImage from "../assets/login_screen_img.png";

type ThemeMode = "light" | "dark";

interface AuthPageProps {
  initialMode: "login" | "register";
  onSuccess: (email: string) => void;
  onBack: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export default function AuthPage({ initialMode, onSuccess, onBack, theme, onToggleTheme }: AuthPageProps) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isDark = theme === "dark";

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onSuccess(email);
    }, 1200);
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

  return (
    <div className={`min-h-screen selection:bg-blue-500/20 ${pageClass}`}>
      <div className="grid min-h-screen lg:grid-cols-[52%_48%]">
        <section className={`relative hidden overflow-hidden border-r ${panelBorder} lg:block`}>
          <img
            src={loginScreenImage}
            alt="Adviso AI strategic workspace illustration"
            className={`absolute inset-0 h-full w-full object-cover object-center ${isDark ? "opacity-55" : "opacity-95"}`}
          />
          <div
            className={
              isDark
                ? "absolute inset-0 bg-[linear-gradient(90deg,rgba(8,13,24,0.92)_0%,rgba(8,13,24,0.72)_36%,rgba(8,13,24,0.35)_100%)]"
                : "absolute inset-0 bg-[linear-gradient(90deg,rgba(248,251,255,0.92)_0%,rgba(248,251,255,0.74)_34%,rgba(248,251,255,0.12)_100%)]"
            }
          />

          <button onClick={onBack} className="absolute left-12 top-10 z-20 flex items-center gap-3">
            <img src={favAdv} alt="Adviso AI" className="h-10 w-10 rounded-lg object-cover mix-blend-multiply" />
            <span className={`text-xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
              Adviso <span className="text-blue-500">AI</span>
            </span>
          </button>

          <div className="relative z-10 flex min-h-screen flex-col justify-center px-12 xl:px-16">
            <div className="max-w-[460px] space-y-5">
              <h1 className={`text-4xl font-black leading-[1.08] tracking-tight xl:text-5xl ${isDark ? "text-white" : "text-slate-950"}`}>
                Initialize Your
                <span className="block text-blue-500">Strategic Workspace</span>
              </h1>
              <p className={`max-w-[420px] text-base font-medium leading-8 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                Connect to the core intelligence matrix. Securely access enterprise-grade scenario modeling and real-time operational runways.
              </p>
            </div>

            <div className={`absolute bottom-10 left-12 flex items-center gap-8 text-xs font-mono font-semibold xl:left-16 ${isDark ? "text-slate-300" : "text-slate-500"}`}>
              <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-blue-500" /> SOC2 Compliant</span>
              <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-blue-500" /> E2E Encryption</span>
              <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-blue-500" /> 99.99% Uptime</span>
            </div>
          </div>
        </section>

        <section
          className={
            isDark
              ? "relative flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_50%_18%,rgba(59,130,246,0.16),transparent_34%),#080d18] px-6 py-20"
              : "relative flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_50%_20%,rgba(59,130,246,0.08),transparent_34%),#fbfdff] px-6 py-20"
          }
        >
          <button
            onClick={onBack}
            className={`absolute left-6 top-6 flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-bold transition md:left-10 md:top-10 ${
              isDark ? "text-slate-400 hover:bg-slate-900 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Website
          </button>

          <button
            onClick={onToggleTheme}
            className={`absolute right-6 top-6 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-black transition md:right-10 md:top-10 ${
              isDark ? "border-slate-700 bg-slate-900 text-slate-100 hover:border-blue-500/60" : "border-slate-200 bg-white text-slate-700 hover:border-blue-200"
            }`}
            aria-label="Toggle login theme"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {isDark ? "Light" : "Dark"}
          </button>

          <button onClick={onBack} className="absolute left-6 top-16 flex items-center gap-2 lg:hidden">
            <img src={favAdv} alt="Adviso AI" className="h-9 w-9 rounded-lg object-cover mix-blend-multiply" />
            <span className={`text-lg font-black tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
              Adviso <span className="text-blue-500">AI</span>
            </span>
          </button>

          <div className="w-full max-w-[440px]">
            <div className="mb-10">
              <h2 className={`text-3xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
                {mode === "login" ? "Welcome back" : "Create your account"}
              </h2>
              <p className={`mt-3 text-sm font-medium ${mutedText}`}>
                {mode === "login" ? "Sign in to access your intelligence console" : "Initialize your workspace and start modeling"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {mode === "register" && (
                <label className="block">
                  <span className={`mb-2 block font-mono text-[11px] font-black uppercase tracking-[0.14em] ${mutedText}`}>Full Name</span>
                  <input
                    type="text"
                    required
                    placeholder="Jane Doe"
                    className={`h-14 w-full rounded-xl px-4 text-sm font-semibold shadow-sm outline-none transition focus:ring-4 ${inputClass}`}
                  />
                </label>
              )}

              <label className="block">
                <span className={`mb-2 block font-mono text-[11px] font-black uppercase tracking-[0.14em] ${mutedText}`}>Corporate Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  placeholder="name@company.com"
                  className={`h-14 w-full rounded-xl px-4 text-sm font-semibold shadow-sm outline-none transition focus:ring-4 ${inputClass}`}
                />
              </label>

              <label className="block">
                <span className={`mb-2 flex items-center justify-between font-mono text-[11px] font-black uppercase tracking-[0.14em] ${mutedText}`}>
                  Password
                  {mode === "login" && <a href="#" className="font-sans text-xs font-bold normal-case tracking-normal text-blue-500 hover:underline">Forgot password?</a>}
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  placeholder="Password"
                  className={`h-14 w-full rounded-xl px-4 text-sm font-semibold shadow-sm outline-none transition focus:ring-4 ${inputClass}`}
                />
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-black text-[#fff] shadow-[0_16px_34px_rgba(37,99,235,0.28)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Authenticating..." : mode === "login" ? "Authenticate" : "Initialize Workspace"}
                {!isSubmitting && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <div className="my-8 flex items-center gap-4">
              <div className={`h-px flex-1 ${isDark ? "bg-slate-800" : "bg-slate-200"}`} />
              <span className={`font-mono text-[10px] font-black uppercase tracking-[0.16em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Or continue with</span>
              <div className={`h-px flex-1 ${isDark ? "bg-slate-800" : "bg-slate-200"}`} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button type="button" onClick={() => onSuccess("google.user@company.com")} className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-black shadow-sm transition ${secondaryButtonClass}`}>
                <span className="text-base font-black text-blue-500">G</span>
                Google
              </button>
              <button type="button" onClick={() => onSuccess("linkedin.user@company.com")} className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-black shadow-sm transition ${secondaryButtonClass}`}>
                <span className="flex h-5 w-5 items-center justify-center rounded bg-[#0A66C2] text-xs font-black text-white">in</span>
                LinkedIn
              </button>
            </div>

            <div className={`mt-8 text-center text-sm font-medium ${mutedText}`}>
              {mode === "login" ? (
                <p>
                  Don't have a workspace?{" "}
                  <button onClick={() => setMode("register")} className="font-black text-blue-500 hover:underline">
                    Request access
                  </button>
                </p>
              ) : (
                <p>
                  Already initialized?{" "}
                  <button onClick={() => setMode("login")} className="font-black text-blue-500 hover:underline">
                    Sign in instantly
                  </button>
                </p>
              )}
            </div>

            <div className={`mx-auto mt-10 flex max-w-sm items-start justify-center gap-2 text-center text-xs leading-5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
              <span>By authenticating, you agree to the Enterprise License Agreement and proprietary Simulation terms of service.</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
