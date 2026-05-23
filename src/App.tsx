import React, { useEffect, useState } from "react";
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
import AuthModal from "./components/AuthModal.tsx";
import PlatformDashboard from "./components/PlatformDashboard.tsx";
import { ArrowRight, Lock, ShieldAlert, Cpu, Sparkles, CheckCircle } from "lucide-react";

export default function App() {
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    return localStorage.getItem("adviso_authenticated_email");
  });
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("adviso_theme") as "dark" | "light") || "dark";
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("adviso_theme", theme);
  }, [theme]);

  const handleAuthSuccess = (email: string) => {
    localStorage.setItem("adviso_authenticated_email", email);
    setUserEmail(email);
  };

  const handleLogout = () => {
    localStorage.removeItem("adviso_authenticated_email");
    setUserEmail(null);
  };

  if (userEmail) {
    return (
      <PlatformDashboard
        userEmail={userEmail}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
      />
    );
  }

  return (
    <div className="relative min-h-screen bg-brand-background text-brand-text-primary selection:bg-brand-primary/30 selection:text-white">
      
      {/* Background Grid Lines & Glow Layer */}
      <div className="absolute inset-0 subtle-grid opacity-20 pointer-events-none z-0"></div>
      
      {/* Dynamic ambient noise / glowing aura spots */}
      <div className="absolute -top-40 left-1/4 w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute top-[2500px] right-10 w-[600px] h-[600px] bg-brand-primary/5 rounded-full blur-[140px] pointer-events-none z-0"></div>

      {/* Shared Header Navbar */}
      <Header 
        userEmail={userEmail} 
        onLogout={handleLogout} 
        onTriggerAuth={() => setIsAuthModalOpen(true)} 
        theme={theme}
        onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
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
        <section id="strategy-portal" className="relative py-24 bg-black/20 overflow-hidden border-t border-b border-white/5">
          {/* Ambient Glow */}
          <div className="absolute -bottom-20 right-1/4 w-96 h-96 bg-brand-primary/10 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
            <div className="text-center max-w-2xl mx-auto mb-12 space-y-4">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-brand-primary bg-brand-primary/10 px-3 py-1 rounded-full border border-brand-primary/20">
                INTERACTIVE CONSOLE
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight font-sans">
                Try Adviso AI Strategic Advisory Live
              </h2>
              <p className="text-sm sm:text-base text-brand-text-secondary leading-relaxed">
                Connect directly with our backend Gemini strategic decision simulator. Run custom assessments for startups and MSMEs with real explainable indicators.
              </p>
            </div>
            
            <div className="relative rounded-2xl overflow-hidden bg-brand-surface/20 border border-white/10 p-8 sm:p-12 text-center dot-grid shadow-2xl">
              {/* Simulated blurred background content preview */}
              <div className="absolute inset-0 opacity-10 filter blur-[8px] pointer-events-none select-none">
                <div className="p-8 space-y-6">
                  <div className="h-8 bg-white/20 w-1/3 rounded mx-auto"></div>
                  <div className="h-28 bg-white/15 rounded"></div>
                  <div className="h-56 bg-white/10 rounded"></div>
                </div>
              </div>
              
              {/* Foreground Authentication Request */}
              <div className="relative z-10 max-w-xl mx-auto py-8 px-4 space-y-6 flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 border border-brand-primary/30 flex items-center justify-center text-brand-primary shadow-xl shadow-brand-primary/10 animate-pulse">
                  <Lock className="w-8 h-8 text-brand-primary" />
                </div>
                
                <div className="space-y-3">
                  <span className="text-xs font-mono font-bold tracking-widest text-brand-primary uppercase px-2 py-0.5 bg-brand-primary/10 rounded border border-brand-primary/20">
                    SECURE CLIENT GATEWAY LOCK
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                    Sign In to Unlock Strategic Advisory Simulator
                  </h3>
                  <p className="text-xs sm:text-sm text-brand-text-secondary leading-relaxed">
                    To safeguard proprietary scenario weights and provide personalized multi-variable runways with Gemini model metrics, active simulation restricts anonymous runs. Verify corporate credentials instantly.
                  </p>
                </div>

                <div className="border-t border-white/5 pt-4 w-full grid grid-cols-3 gap-2 max-w-md text-left text-[10px] font-mono text-brand-text-secondary">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-primary"></span>
                    <span>Runway Scoring</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-primary"></span>
                    <span>Scenario Modeling</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-primary"></span>
                    <span>Explainable AI</span>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto pt-2">
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="w-full sm:w-auto bg-brand-primary hover:bg-brand-primary/95 text-xs font-bold text-white px-8 py-4 rounded-xl shadow-lg shadow-brand-primary/20 transition-all flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5"
                  >
                    <span>Access Application / Sign In</span>
                    <ArrowRight className="w-4 h-4" />
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
                    className="w-full sm:w-auto bg-white/5 hover:bg-white/10 text-xs font-semibold text-white px-6 py-4 rounded-xl border border-white/10 transition-all cursor-pointer"
                  >
                    Compare Workspace Pricing
                  </button>
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
        <Pricing />

        {/* 12. Final CTA Banner */}
        <FinalCTA />

      </main>

      {/* Corporate Site Footer */}
      <Footer />

      {/* Global Interactive Authentication Overlay Portal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onSuccess={handleAuthSuccess} 
      />

    </div>
  );
}
