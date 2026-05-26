import React, { Suspense, lazy, useCallback, useState, useEffect } from "react";
import Header from "./sections/Header.tsx";
import Hero from "./sections/Hero.tsx";
import { ShieldAlert, Lock, CheckCircle } from "lucide-react";
import Lenis from "lenis";
import { AnimatePresence, motion } from "motion/react";
import { initGoogleAnalytics, trackEvent, trackPageView } from "./analytics.ts";
import { authorizedFetch, readApiJson } from "./config";
import { useAuth } from "./lib/AuthContext.tsx";
import { checkoutPlanForId, checkoutPlanForName, type CheckoutPlan } from "./subscriptions/checkoutPlans.ts";
import type { DashboardTabId, PlanId } from "./subscriptions/permissions.ts";

const Trust = lazy(() => import("./sections/Trust.tsx"));
const PlatformOverview = lazy(() => import("./sections/PlatformOverview.tsx"));
const CoreFeatures = lazy(() => import("./sections/CoreFeatures.tsx"));
const UseCases = lazy(() => import("./sections/UseCases.tsx"));
const Workflow = lazy(() => import("./sections/Workflow.tsx"));
const DashboardShowcase = lazy(() => import("./sections/DashboardShowcase.tsx"));
const Architecture = lazy(() => import("./sections/Architecture.tsx"));
const Security = lazy(() => import("./sections/Security.tsx"));
const Pricing = lazy(() => import("./sections/Pricing.tsx"));
const FinalCTA = lazy(() => import("./sections/FinalCTA.tsx"));
const Footer = lazy(() => import("./sections/Footer.tsx"));
const PlatformDashboard = lazy(() => import("./components/PlatformDashboard.tsx"));
const PaymentCheckout = lazy(() => import("./components/PaymentCheckout.tsx"));
const AuthPage = lazy(() => import("./components/AuthPage.tsx"));

type ThemeMode = "light" | "dark";
type ThemePreference = ThemeMode | "system";

const PUBLIC_SECTION_ROUTES: Record<string, string> = {
  "/features": "core-features",
  "/pricing": "pricing",
  "/about": "architecture",
  "/contact": "contact",
};

const APP_ROUTE_TO_TAB: Record<string, DashboardTabId> = {
  "/app": "Overview",
  "/app/overview": "Overview",
  "/app/chat": "Chat",
  "/app/ideas": "Ideas",
  "/app/budget": "Budget",
  "/app/analytics": "Charts",
  "/app/charts": "Charts",
  "/app/ai": "AI",
  "/app/profit": "Profit",
  "/app/forecast": "Forecast",
  "/app/competitor": "Competitor",
  "/app/esg": "Sustainability",
  "/app/kpi": "KPI",
  "/app/settings": "Overview",
};

const APP_TAB_ROUTES: Record<DashboardTabId, string> = {
  Overview: "/app",
  Chat: "/app/chat",
  Ideas: "/app/ideas",
  Budget: "/app/budget",
  Charts: "/app/analytics",
  AI: "/app/ai",
  Profit: "/app/profit",
  Forecast: "/app/forecast",
  Competitor: "/app/competitor",
  Sustainability: "/app/esg",
  KPI: "/app/kpi",
};

function currentPath() {
  return window.location.pathname || "/";
}

function appTabForPath(path: string): DashboardTabId {
  return APP_ROUTE_TO_TAB[path] || "Overview";
}

function isAppRoute(path: string) {
  return path === "/app" || path.startsWith("/app/");
}

function isAuthRoute(path: string) {
  return path === "/login" || path === "/register";
}

function routeDepth(path: string) {
  if (path === "/checkout") return 3;
  if (isAppRoute(path)) return 2;
  if (isAuthRoute(path)) return 1;
  return 0;
}

function pageTitleForPath(path: string) {
  if (path === "/checkout") return "Adviso AI - Checkout";
  if (path === "/login") return "Adviso AI - Login";
  if (path === "/register") return "Adviso AI - Register";
  if (isAppRoute(path)) return "Adviso AI - Dashboard";
  if (path === "/pricing") return "Adviso AI - Pricing";
  if (path === "/features") return "Adviso AI - Features";
  return "Adviso AI - Landing";
}

function systemTheme(): ThemeMode {
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

function normalizeThemePreference(value: string | null): ThemePreference | null {
  if (value === "light" || value === "dark" || value === "system") return value;
  return null;
}

function readInitialThemePreference(): ThemePreference {
  return normalizeThemePreference(localStorage.getItem("adviso_theme_preference"))
    || normalizeThemePreference(localStorage.getItem("adviso_theme"))
    || "system";
}

function resolveThemePreference(preference: ThemePreference): ThemeMode {
  return preference === "system" ? systemTheme() : preference;
}

function RouteTransition({
  children,
  routeKey,
  direction,
  variant = "page",
}: {
  children: React.ReactNode;
  routeKey: string;
  direction: number;
  variant?: "page" | "auth" | "checkout";
}) {
  const distance = variant === "auth" ? 38 : variant === "checkout" ? 28 : 18;

  return (
    <motion.div
      key={routeKey}
      initial={{ opacity: 0, x: direction >= 0 ? distance : -distance, filter: "blur(8px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, x: direction >= 0 ? -distance : distance, filter: "blur(8px)" }}
      transition={{ duration: variant === "page" ? 0.52 : 0.44, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen"
    >
      {children}
    </motion.div>
  );
}

function SectionLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-10 w-10 rounded-full border border-brand-border border-t-brand-primary animate-spin" />
    </div>
  );
}

export default function App() {
  const { user, profile, loading: authLoading, logout } = useAuth();
  const userEmail = profile?.email || user?.email || null;
  const [path, setPath] = useState(currentPath);
  const [routeDirection, setRouteDirection] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<CheckoutPlan | null>(null);
  const [themePreference, setThemePreference] = useState<ThemePreference>(readInitialThemePreference);
  const [theme, setTheme] = useState<ThemeMode>(() => resolveThemePreference(readInitialThemePreference()));

  useEffect(() => {
    initGoogleAnalytics();
  }, []);

  useEffect(() => {
    trackPageView(pageTitleForPath(path), path);
  }, [path]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("adviso_theme", theme);
  }, [theme]);

  useEffect(() => {
    const applyTheme = () => setTheme(resolveThemePreference(themePreference));
    localStorage.setItem("adviso_theme_preference", themePreference);
    applyTheme();

    if (themePreference !== "system" || !window.matchMedia) return undefined;

    const query = window.matchMedia("(prefers-color-scheme: dark)");
    query.addEventListener("change", applyTheme);
    return () => query.removeEventListener("change", applyTheme);
  }, [themePreference]);

  const applyThemePreference = useCallback((preference: string) => {
    const normalized = normalizeThemePreference(preference);
    if (!normalized) return;
    setThemePreference(normalized);
  }, []);

  const toggleTheme = () => {
    setThemePreference((prev) => (resolveThemePreference(prev) === "light" ? "dark" : "light"));
  };

  const navigate = useCallback((nextPath: string, options?: { replace?: boolean }) => {
    const normalized = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
    setRouteDirection(routeDepth(normalized) >= routeDepth(window.location.pathname || "/") ? 1 : -1);
    if (normalized === window.location.pathname) {
      setPath(normalized);
      return;
    }
    if (options?.replace) {
      window.history.replaceState({}, "", normalized);
    } else {
      window.history.pushState({}, "", normalized);
    }
    setPath(normalized);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const nextPath = currentPath();
      setRouteDirection(routeDepth(nextPath) >= routeDepth(path) ? 1 : -1);
      setPath(nextPath);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [path]);

  useEffect(() => {
    if (isAppRoute(path)) return undefined;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    const raf = (time: number) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, [path]);

  useEffect(() => {
    if (authLoading) return;

    if (user) {
      if (path === "/" || isAuthRoute(path)) {
        navigate("/app", { replace: true });
      }
      return;
    }

    if (isAppRoute(path) || path === "/checkout") {
      navigate("/login", { replace: true });
    }
  }, [authLoading, navigate, path, user]);

  useEffect(() => {
    if (authLoading || !user) return undefined;

    let cancelled = false;
    authorizedFetch("/api/account/settings")
      .then((response) => readApiJson<{ preferences?: { theme?: string } }>(response))
      .then((payload) => {
        if (!cancelled && payload.preferences?.theme) {
          applyThemePreference(payload.preferences.theme);
        }
      })
      .catch(() => {
        // Theme preference is non-critical; authenticated app access can continue.
      });

    return () => {
      cancelled = true;
    };
  }, [applyThemePreference, authLoading, user]);

  useEffect(() => {
    if (path === "/checkout" && user && !selectedPlan) {
      navigate("/app", { replace: true });
    }
  }, [navigate, path, selectedPlan, user]);

  useEffect(() => {
    if (path === "/") {
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    const targetId = PUBLIC_SECTION_ROUTES[path];
    if (!targetId) return;

    window.setTimeout(() => {
      const target = document.getElementById(targetId);
      if (!target) return;
      const offset = 80;
      window.scrollTo({
        top: target.getBoundingClientRect().top + window.scrollY - offset,
        behavior: "smooth",
      });
    }, 80);
  }, [path]);

  const handleAuthSuccess = () => {
    trackEvent("login", { method: "firebase" });
    setSelectedPlan(null);
    navigate("/app", { replace: true });
  };

  const handleLogout = async () => {
    trackEvent("logout");
    await logout();
    navigate("/", { replace: true });
  };

  const startPlanCheckout = useCallback(
    (planId: PlanId) => {
      const checkoutPlan = checkoutPlanForId(planId);
      if (!checkoutPlan) return;
      setSelectedPlan(checkoutPlan);
      trackEvent("begin_checkout", { plan_id: planId, plan_name: checkoutPlan.name, plan_price: checkoutPlan.price });
      navigate(user ? "/checkout" : "/login");
    },
    [navigate, user],
  );

  const goToCheckout = (planName: string, price: string, amountPaise: number) => {
    const checkoutPlan = checkoutPlanForName(planName, price, amountPaise);
    if (!checkoutPlan) return;
    setSelectedPlan(checkoutPlan);
    trackEvent("begin_checkout", { plan_name: planName, plan_price: price });
    navigate(user ? "/checkout" : "/login");
  };

  const handleCheckoutComplete = () => {
    setSelectedPlan(null);
    navigate("/app", { replace: true });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-brand-background text-brand-text-primary flex items-center justify-center">
        <div className="rounded-2xl border border-brand-border bg-brand-surface px-6 py-5 text-sm font-semibold text-brand-text-secondary">
          Loading secure workspace...
        </div>
      </div>
    );
  }

  if (isAppRoute(path)) {
    if (!userEmail) {
      return (
        <div className="min-h-screen bg-brand-background text-brand-text-primary flex items-center justify-center">
          <div className="rounded-2xl border border-brand-border bg-brand-surface px-6 py-5 text-sm font-semibold text-brand-text-secondary">
            Redirecting to sign in...
          </div>
        </div>
      );
    }

    return (
      <Suspense fallback={<SectionLoader />}>
        <PlatformDashboard
          userEmail={userEmail}
          onLogout={() => void handleLogout()}
          theme={theme}
          onToggleTheme={toggleTheme}
          onThemePreferenceChange={applyThemePreference}
          initialTab={appTabForPath(path)}
          onTabChange={(tab) => navigate(APP_TAB_ROUTES[tab])}
          onUpgradeRequested={startPlanCheckout}
        />
      </Suspense>
    );
  }

  if (path === "/checkout" && selectedPlan) {
    return (
      <AnimatePresence mode="wait">
        <RouteTransition routeKey="checkout" direction={routeDirection} variant="checkout">
          <Suspense fallback={<SectionLoader />}>
            <PaymentCheckout
              plan={selectedPlan}
              onBack={() => navigate("/app")}
              onCancel={() => navigate(user ? "/app" : "/pricing")}
              onComplete={handleCheckoutComplete}
            />
          </Suspense>
        </RouteTransition>
      </AnimatePresence>
    );
  }

  if (isAuthRoute(path)) {
    return (
      <AnimatePresence mode="wait">
        <RouteTransition routeKey={path} direction={routeDirection} variant="auth">
          <Suspense fallback={<SectionLoader />}>
            <AuthPage
              initialMode={path === "/register" ? "register" : "login"}
              onSuccess={handleAuthSuccess}
              onBack={() => navigate("/")}
              theme={theme}
              onToggleTheme={toggleTheme}
            />
          </Suspense>
        </RouteTransition>
      </AnimatePresence>
    );
  }

  return (
    <RouteTransition routeKey="marketing" direction={routeDirection} variant="page">
      <div className="relative min-h-screen bg-brand-background text-brand-text-primary selection:bg-brand-primary/30 selection:text-brand-text-primary transition-colors duration-300">
        <div className="absolute inset-0 subtle-grid opacity-20 pointer-events-none z-0"></div>
        <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-gradient-to-br from-brand-primary/10 to-brand-primary/5 rounded-full blur-[150px] pointer-events-none z-0 transition-colors duration-500"></div>
        <div className="absolute top-[20%] right-0 w-[600px] h-[600px] bg-gradient-to-bl from-brand-primary/10 to-blue-500/5 rounded-full blur-[150px] pointer-events-none z-0 transition-colors duration-500"></div>
        <div className="absolute top-[60%] left-[-10%] w-[800px] h-[800px] bg-gradient-to-tr from-blue-500/10 to-brand-primary/5 rounded-full blur-[180px] pointer-events-none z-0 transition-colors duration-500"></div>
        <div className="absolute top-[80%] right-10 w-[600px] h-[600px] bg-brand-primary/5 rounded-full blur-[140px] pointer-events-none z-0 transition-colors duration-500"></div>

        <Header
          userEmail={userEmail}
          onLogout={() => void handleLogout()}
          onTriggerAuth={() => navigate("/login")}
          onOpenApp={() => navigate("/app")}
          onNavigatePublic={(nextPath) => navigate(nextPath)}
          theme={theme}
          toggleTheme={toggleTheme}
        />

        <main className="relative z-10 w-full overflow-hidden">
          <Hero />

          <Suspense fallback={<SectionLoader />}>
            <Trust />
            <PlatformOverview />
            <CoreFeatures />
            <UseCases />
            <Workflow />
            <DashboardShowcase />
          </Suspense>

          <section id="strategy-portal" className="relative py-24 bg-brand-surface-secondary/50 overflow-hidden border-t border-b border-brand-border">
            <div className="absolute -bottom-20 right-1/4 w-96 h-96 bg-[var(--brand-primary)]/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="w-full px-6 md:px-12 xl:px-24 relative z-10 mx-auto max-w-[2000px]">
              <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-brand-primary">
                  Interactive Console
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-brand-text-primary leading-tight font-sans">
                  Strategic Advisory Live
                </h2>
                <p className="text-sm sm:text-base text-brand-text-secondary leading-relaxed">
                  Connect directly with our backend strategic decision simulator. Run custom assessments for startups and enterprises with real explainable indicators.
                </p>
              </div>

              <div className="relative rounded-3xl overflow-hidden bg-brand-surface border border-brand-border p-8 sm:p-16 max-w-4xl mx-auto shadow-2xl flex flex-col items-center justify-center min-h-[450px]">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 via-transparent to-transparent pointer-events-none"></div>

                <div className="relative z-10 w-full max-w-lg mx-auto text-center space-y-8">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-brand-surface-secondary border border-brand-border flex items-center justify-center text-brand-text-primary shadow-[0_4px_20px_rgba(0,0,0,0.05)] mb-6">
                    <Lock className="w-8 h-8 text-brand-primary" strokeWidth={1.5} />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2 text-[10px] font-mono font-bold tracking-widest text-brand-primary uppercase bg-brand-primary/10 px-3 py-1.5 rounded-full border border-brand-primary/20 w-max mx-auto">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Secure Enterprise Gateway</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-brand-text-primary tracking-tight leading-tight">
                      Authentication Required
                    </h3>
                    <p className="text-sm text-brand-text-secondary leading-relaxed">
                      Access to the Strategic Advisory Simulator is restricted to verified users. Please sign in to authenticate your workspace and run custom multi-variable assessments.
                    </p>
                  </div>

                  <div className="pt-8 border-t border-brand-border/50 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                      onClick={() => navigate("/login")}
                      className="w-full sm:w-auto bg-brand-primary text-white hover:bg-brand-primary/90 text-sm font-bold px-8 py-4 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                    >
                      <span>Sign In to Access</span>
                    </button>
                    <button
                      onClick={() => navigate("/pricing")}
                      className="w-full sm:w-auto bg-brand-surface hover:bg-brand-surface-secondary text-sm font-semibold text-brand-text-primary px-8 py-4 rounded-xl border border-brand-border shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_15px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 transition-all"
                    >
                      View Enterprise Pricing
                    </button>
                  </div>

                  <div className="pt-6 flex justify-center gap-6 text-[11px] font-medium text-brand-text-secondary">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-brand-primary/70" />
                      <span>SOC2 Compliant</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-brand-primary/70" />
                      <span>SSO Ready</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-brand-primary/70" />
                      <span>E2E Encrypted</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <Suspense fallback={<SectionLoader />}>
            <Architecture />
            <Security />
            <Pricing onSelectPlan={goToCheckout} />
            <FinalCTA />
          </Suspense>
        </main>

        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      </div>
    </RouteTransition>
  );
}
