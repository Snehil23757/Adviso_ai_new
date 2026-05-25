import AISalesAnalytics from "./pages/AISalesAnalytics";
import React, { useState, useEffect } from "react";
import Header from "./sections/Header.tsx";
import Hero from "./sections/Hero.tsx";
import Trust from "./sections/Trust.tsx";
import PlatformOverview from "./sections/PlatformOverview.tsx";
import CoreFeatures from "./sections/CoreFeatures.tsx";
import UseCases from "./sections/UseCases.tsx";
import Workflow from "./sections/Workflow.tsx";
import DashboardShowcase from "./sections/DashboardShowcase.tsx";
import LiveStrategyPortal from "./components/LiveStrategyPortal.tsx";
import Architecture from "./sections/Architecture.tsx";
import Security from "./sections/Security.tsx";
import Pricing from "./sections/Pricing.tsx";
import FinalCTA from "./sections/FinalCTA.tsx";
import Footer from "./sections/Footer.tsx";
import PlatformDashboard from "./components/PlatformDashboard.tsx";
import PaymentCheckout from "./components/PaymentCheckout.tsx";
import AuthPage from "./components/AuthPage.tsx";
import { ShieldAlert, Lock, CheckCircle } from "lucide-react";
import Lenis from "lenis";
import { initGoogleAnalytics, trackEvent, trackPageView } from "./analytics.ts";

export default function App() {
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    return localStorage.getItem("adviso_authenticated_email");
  });
  const [currentView, setCurrentView] = useState<"landing" | "dashboard" | "checkout" | "login" | "register">(() => {
    return localStorage.getItem("adviso_authenticated_email") ? "dashboard" : "landing";
  });
  const [selectedPlan, setSelectedPlan] = useState<{name: string, price: string} | null>(null);
  
  // Theme state
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const savedTheme = localStorage.getItem("adviso_theme");
    if (savedTheme) return savedTheme as "light" | "dark";
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    return "light";
  });

  useEffect(() => {
    initGoogleAnalytics();
  }, []);

  useEffect(() => {
    const viewTitles = {
      landing: "Adviso AI - Landing",
      dashboard: "Adviso AI - Dashboard",
      checkout: "Adviso AI - Checkout",
      login: "Adviso AI - Login",
      register: "Adviso AI - Register",
    };

    trackPageView(viewTitles[currentView], `/${currentView}`);
  }, [currentView]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("adviso_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light");
  };

  useEffect(() => {
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
  }, []);

  const handleAuthSuccess = (email: string) => {
    localStorage.setItem("adviso_authenticated_email", email);
    trackEvent("login", { method: "local" });
    setUserEmail(email);
    setCurrentView("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("adviso_authenticated_email");
    trackEvent("logout");
    setUserEmail(null);
    setCurrentView("landing");
  };

  const goToCheckout = (planName: string, price: string) => {
    setSelectedPlan({ name: planName, price });
    trackEvent("begin_checkout", { plan_name: planName, plan_price: price });
    setCurrentView("checkout");
  };

  if (currentView === "dashboard" && userEmail) {
    return (
      <PlatformDashboard
        userEmail={userEmail}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  if (currentView === "checkout" && selectedPlan) {
    return <PaymentCheckout plan={selectedPlan} onBack={() => setCurrentView("landing")} />;
  }

  if (currentView === "login" || currentView === "register") {
    return (
      <AuthPage 
        initialMode={currentView} 
        onSuccess={handleAuthSuccess} 
        onBack={() => setCurrentView("landing")} 
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <div className="relative min-h-screen bg-brand-background text-brand-text-primary selection:bg-brand-primary/30 selection:text-brand-text-primary transition-colors duration-300">
      
      {/* Background Grid Lines & Glow Layer */}
      <div className="absolute inset-0 subtle-grid opacity-20 pointer-events-none z-0"></div>
      
      {/* Dynamic ambient noise / glowing aura spots - soft premium lighting */}
      <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-gradient-to-br from-brand-primary/10 to-brand-primary/5 rounded-full blur-[150px] pointer-events-none z-0 transition-colors duration-500"></div>
      <div className="absolute top-[20%] right-0 w-[600px] h-[600px] bg-gradient-to-bl from-brand-primary/10 to-blue-500/5 rounded-full blur-[150px] pointer-events-none z-0 transition-colors duration-500"></div>
      <div className="absolute top-[60%] left-[-10%] w-[800px] h-[800px] bg-gradient-to-tr from-blue-500/10 to-brand-primary/5 rounded-full blur-[180px] pointer-events-none z-0 transition-colors duration-500"></div>
      <div className="absolute top-[80%] right-10 w-[600px] h-[600px] bg-brand-primary/5 rounded-full blur-[140px] pointer-events-none z-0 transition-colors duration-500"></div>

      {/* Shared Header Navbar */}
      <Header 
        userEmail={userEmail} 
        onLogout={handleLogout} 
        onTriggerAuth={() => setCurrentView("login")} 
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* Main Structural Content Grid */}
      <main className="relative z-10 w-full overflow-hidden">
        
        {/* 1. Large Editorial Hero Frame */}
        <Hero />

        {/* 2. Platform Trust metrics Section */}
        <Trust />

        {/* 3. Platform Capabilities Overview */}
        <PlatformOverview />

        {/* 4. Core Grid Features */}
        <CoreFeatures />

        {/* 5. Audience Target Playbooks (Tabbed layout) */}
        <UseCases />

        {/* 6. Continuous Pipeline Timeline Stream */}
        <Workflow />

        {/* 7. Live Interactive What-If Scenario Chart Simulator */}
        <DashboardShowcase />

        {/* 8. Live Real-time AI Decision Portal Integration Block */}
        <section id="strategy-portal" className="relative py-24 bg-brand-surface-secondary/50 overflow-hidden border-t border-b border-brand-border">
          {/* Ambient Glow */}
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
              {/* Subtle gradient background instead of blurred noise */}
              <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 via-transparent to-transparent pointer-events-none"></div>
              
              {/* Foreground Authentication Request */}
              <div className="relative z-10 w-full max-w-lg mx-auto text-center space-y-8">
                {/* Icon */}
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
                    onClick={() => setCurrentView("login")}
                    className="w-full sm:w-auto bg-brand-primary text-white hover:bg-brand-primary/90 text-sm font-bold px-8 py-4 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                  >
                    <span>Sign In to Access</span>
                  </button>
                  <button
                    onClick={() => {
                      const pricingTab = document.getElementById("pricing");
                      if (pricingTab) {
                        const offset = 80;
                        window.scrollTo({
                          top: pricingTab.getBoundingClientRect().top + window.scrollY - offset,
                          behavior: "smooth"
                        });
                      }
                    }}
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

        {/* 9. Interactive Full-Stack Integration Architecture Map */}
        <Architecture />

        {/* 10. Security Compliance Section */}
        <Security />

        {/* 11. Custom Tiered Pricing Grid */}
        <Pricing onSelectPlan={goToCheckout} />

        {/* 12. Final CTA Banner */}
        <FinalCTA />

      </main>

      {/* Corporate Site Footer */}
      <Footer />
    </div>
  );
}
