import React, { Suspense, lazy, useCallback, useState, useEffect } from "react";
import Header from "./sections/Header.tsx";
import Hero from "./sections/Hero.tsx";
import { AnimatePresence, motion } from "motion/react";
import { initGoogleAnalytics, trackEvent, trackPageView } from "./analytics.ts";
import { authorizedFetch, readApiJson } from "./config";
import { useAuth } from "./lib/AuthContext.tsx";
import { checkoutPlanForId, checkoutPlanForName, type CheckoutPlan } from "./subscriptions/checkoutPlans.ts";
import type { DashboardTabId, PlanId } from "./subscriptions/permissions.ts";

const Trust = lazy(() => import("./sections/Trust.tsx"));
const LaptopScene = lazy(() => import("./components/LaptopScene.tsx"));
const CinematicProfilesScene = lazy(() => import("./sections/landing/CinematicProfilesScene.tsx"));
const Security = lazy(() => import("./sections/Security.tsx"));
const Pricing = lazy(() => import("./sections/Pricing.tsx"));
const About = lazy(() => import("./sections/About.tsx"));
const Vision = lazy(() => import("./sections/Vision.tsx"));
const FinalCTA = lazy(() => import("./sections/FinalCTA.tsx"));
const Footer = lazy(() => import("./sections/Footer.tsx"));
const PlatformDashboard = lazy(() => import("./components/PlatformDashboard.tsx"));
const PaymentCheckout = lazy(() => import("./components/PaymentCheckout.tsx"));
const AuthPage = lazy(() => import("./components/AuthPage.tsx"));

type ThemeMode = "light" | "dark";
type ThemePreference = ThemeMode | "system";

const PUBLIC_SECTION_ROUTES: Record<string, string> = {
  "/platform": "platform-overview",
  "/features": "platform-overview",
  "/use-cases": "use-cases",
  "/architecture": "security",
  "/pricing": "pricing",
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
  return path === "/login" || path === "/register" || path === "/forgot-password";
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
  if (path === "/forgot-password") return "Adviso AI - Reset Password";
  if (isAppRoute(path)) return "Adviso AI - Dashboard";
  if (path === "/platform") return "Adviso AI - Platform";
  if (path === "/pricing") return "Adviso AI - Pricing";
  if (path === "/features") return "Adviso AI - Features";
  if (path === "/use-cases") return "Adviso AI - Use Cases";
  if (path === "/architecture") return "Adviso AI - Architecture";
  if (path === "/about") return "Adviso AI - About Us";
  if (path === "/vision") return "Adviso AI - Vision & Mission";
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

function WorkspaceLoader({ label }: { label: string }) {
  return (
    <div className="min-h-screen bg-brand-background text-brand-text-primary flex items-center justify-center">
      <motion.div
        className="rounded-2xl border border-brand-border bg-brand-surface px-6 py-5 text-sm font-semibold text-brand-text-secondary shadow-2xl shadow-brand-primary/10"
        initial={{ opacity: 0, y: 14, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-primary opacity-40" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-brand-primary" />
          </span>
          {label}
        </div>
      </motion.div>
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
    if (path === "/team") {
      navigate("/about", { replace: true });
    }
  }, [navigate, path]);

  useEffect(() => {
    if (path === "/" || path === "/about" || path === "/vision") {
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

  const isStandaloneCompanyPage = path === "/about" || path === "/vision";

  if (authLoading) {
    return <WorkspaceLoader label="Restoring secure workspace..." />;
  }

  if (isAppRoute(path)) {
    if (!userEmail) {
      return <WorkspaceLoader label="Preparing sign in..." />;
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
              initialMode={path === "/register" ? "register" : path === "/forgot-password" ? "forgot" : "login"}
              onSuccess={handleAuthSuccess}
              onBack={() => navigate("/")}
              onNavigateAuth={(mode) => navigate(mode === "register" ? "/register" : mode === "forgot" ? "/forgot-password" : "/login")}
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

        <main className="relative z-10 w-full">
          {isStandaloneCompanyPage ? (
            <div className="pt-24 lg:pt-[104px]">
              <Suspense fallback={<SectionLoader />}>
                {path === "/about" && <About />}
                {path === "/vision" && <Vision />}
              </Suspense>
            </div>
          ) : (
            <>
              <Hero />

              <Suspense fallback={<SectionLoader />}>
                <Trust />
              </Suspense>

              <Suspense fallback={<SectionLoader />}>
                <section id="platform-overview" className="adviso-scroll-scene bg-[#02040a]">
                  <LaptopScene />
                </section>
                <section id="use-cases" className="adviso-scroll-scene bg-[#02040a]">
                  <CinematicProfilesScene />
                </section>
              </Suspense>

              <Suspense fallback={<SectionLoader />}>
                <Security />
                <Pricing onSelectPlan={goToCheckout} />
                <FinalCTA />
              </Suspense>
            </>
          )}
        </main>

        <Suspense fallback={null}>
          <Footer onNavigatePublic={(nextPath) => navigate(nextPath)} />
        </Suspense>
      </div>
    </RouteTransition>
  );
}
