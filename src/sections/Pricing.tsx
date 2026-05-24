import React, { useState } from "react";
import { CheckCircle2, ChevronRight, HelpCircle } from "lucide-react";
import { motion } from "motion/react";

export default function Pricing({ onSelectPlan }: { onSelectPlan?: (name: string, price: string) => void }) {
  const [isAnnual, setIsAnnual] = useState(true);

  const plans = [
    {
      name: "GO",
      price: 99,
      periodCaps: "₹99 / month",
      bestFor: "For Individuals & Small Businesses",
      includedTabs: ["Overview", "AI Chat", "Idea", "Budget"],
      themeType: "dark-gray",
      desc: "Designed to provide essential digital strategies and key indicators.",
      features: [
        "Basic AI recommendations",
        "Simple business insights",
        "Monthly growth suggestions",
        "Limited AI requests",
        "Single-user access",
      ]
    },
    {
      name: "PRO",
      price: 499,
      periodCaps: "₹499 / month",
      bestFor: "For Startups & Growing Businesses",
      includedTabs: ["Overview", "Charts", "AI", "Chat", "Profit", "Forecast", "Competitor"],
      themeType: "electric-blue",
      popular: true,
      desc: "Full pipeline optimization mapping indicators and projecting runway.",
      features: [
        "Advanced AI business analysis",
        "Smart forecasting",
        "Competitor tracking",
        "Profit optimization",
        "KPI summaries",
        "Priority AI processing",
      ]
    },
    {
      name: "ENTERPRISE",
      price: 4999,
      periodCaps: "₹4,999 / month",
      bestFor: "For Companies & Teams",
      includedTabs: ["Overview", "Charts", "AI", "Chat", "Idea", "Profit", "Forecast", "Budget", "Sustainability", "Competitor", "KPI"],
      themeType: "matte-black",
      desc: "Comprehensive custom parameters and direct integration channels.",
      features: [
        "Unlimited AI analysis",
        "Advanced KPI intelligence",
        "Team collaboration",
        "Real-time forecasting",
        "Sustainability insights",
        "Multi-business management",
        "API integrations",
        "Enterprise security",
        "Dedicated support",
      ]
    }
  ];

  return (
    <section id="pricing" className="relative py-24 bg-brand-surface-secondary overflow-hidden">
      <div className="absolute inset-0 subtle-grid opacity-10 pointer-events-none"></div>

      <div className="w-full px-6 md:px-12 xl:px-24 relative z-10 space-y-16 max-w-[2000px] mx-auto">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-brand-primary bg-brand-primary/10 px-3 py-1 rounded-full border border-brand-primary/20">
            Adviso AI Pricing Plans
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-brand-text-primary leading-tight font-sans">
            Choose Your Intelligence Level
          </h2>
          <p className="text-sm sm:text-base text-brand-text-secondary leading-relaxed max-w-2xl mx-auto">
            A smarter pricing structure for Adviso AI designed for individuals, startups, and enterprises.
          </p>

          {/* Toggle button layout */}
          <div className="pt-3 flex items-center justify-center">
            <div className="bg-brand-surface rounded-xl p-1 border border-brand-border flex items-center gap-1.5 shadow-inner">
              <button
                type="button"
                onClick={() => setIsAnnual(false)}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  !isAnnual 
                    ? "bg-brand-primary text-brand-text-primary" 
                    : "text-brand-text-secondary hover:text-brand-text-primary"
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setIsAnnual(true)}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  isAnnual 
                    ? "bg-brand-primary text-brand-text-primary" 
                    : "text-brand-text-secondary hover:text-brand-text-primary"
                }`}
              >
                <span>Annual Billing</span>
                <span className="bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 px-1.5 py-0.5 rounded text-[9px] font-mono leading-none">
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto pt-6">
          {plans.map((p, pIdx) => {
            // Apply annual discount if selected (20% off)
            const basePrice = p.price;
            const finalizedPrice = isAnnual ? Math.round(basePrice * 0.8) : basePrice;

            // Compute theme styling wrapper
            let themeStyles = "";
            if (p.themeType === "dark-gray") {
              // Standard Card - clean semantic colors
              themeStyles = "bg-brand-surface border border-brand-primary/20 hover:border-brand-primary/40 hover:shadow-xl shadow-black/5 transition-all";
            } else if (p.themeType === "electric-blue") {
              // Popular "PRO" card - Double Slim Border style (ring + border)
              themeStyles = "bg-brand-surface border border-brand-primary ring-1 ring-brand-primary/30 shadow-2xl shadow-brand-primary/5 z-10 scale-[1.02]";
            } else if (p.themeType === "matte-black") {
              // Enterprise Card - Slightly offset background color
              themeStyles = "bg-brand-surface border border-brand-primary/40 hover:border-brand-primary/80 transition-shadow shadow-xl shadow-brand-primary/5";
            }

            return (
              <motion.div
                key={pIdx}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: p.popular ? 1.05 : 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: pIdx * 0.15, ease: [0.16, 1, 0.3, 1] }}
                className={`relative rounded-2xl flex flex-col justify-between p-6 lg:p-8 overflow-hidden ${themeStyles}`}
              >
                {/* Popular Badge for PRO */}
                {p.popular && (
                  <div className="absolute top-0 right-0 bg-brand-primary text-white px-4 py-1.5 rounded-bl-xl text-[10px] font-mono font-bold uppercase tracking-wider">
                    Most Popular
                  </div>
                )}

                <div className="space-y-6 text-left">
                  {/* Card Identifier */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl font-black text-brand-text-primary tracking-tight">{p.name}</span>
                      {p.themeType === "matte-black" && (
                        <span className="text-[9px] bg-brand-primary/10 border border-brand-primary/20 text-brand-primary font-mono px-1.5 rounded tracking-widest uppercase">
                          ENTERPRISE MATRIX
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-brand-primary tracking-wide">
                      {p.bestFor}
                    </p>
                    <p className="text-xs text-brand-text-secondary mt-2 leading-relaxed">
                      {p.desc}
                    </p>
                  </div>

                  {/* Pricing Label */}
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-brand-text-primary">₹{finalizedPrice.toLocaleString("en-IN")}</span>
                      <span className="text-xs text-brand-text-secondary font-mono">/ mo</span>
                    </div>
                    <span className="text-[10px] font-mono text-brand-text-secondary uppercase">
                      {isAnnual ? "Billed annually (Save 20%)" : "Billed month-to-month"}
                    </span>
                  </div>

                  {/* Included Tabs Segment */}
                  <div className="bg-brand-surface-secondary p-3 rounded-xl border border-brand-border space-y-1.5">
                    <span className="block text-[9px] font-mono text-brand-text-secondary uppercase tracking-widest">
                      INCLUDED INTERFACE TABS
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {p.includedTabs.map((tab, tIdx) => (
                        <span 
                          key={tIdx} 
                          className="bg-brand-text-primary/5 hover:bg-brand-text-primary/10 transition-colors text-[10px] font-mono text-brand-text-primary border border-brand-border px-2 py-0.5 rounded cursor-default"
                        >
                          {tab}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Features list */}
                  <div className="border-t border-brand-border pt-5 space-y-3">
                    <span className="block text-[9px] font-mono text-brand-text-secondary uppercase tracking-widest">
                      CORE SPECIFIED CAPABILITIES
                    </span>
                    <div className="space-y-2.5">
                      {p.features.map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-start gap-2.5 text-xs">
                          <CheckCircle2 className="w-4 h-4 text-brand-primary mt-0.5 shrink-0" />
                          <span className="text-brand-text-primary/95 leading-normal">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-8">
                  <button
                    onClick={() => {
                      if (onSelectPlan) {
                        onSelectPlan(p.name, `₹${finalizedPrice.toLocaleString("en-IN")}`);
                      } else {
                        const portal = document.getElementById("strategy-portal");
                        if (portal) {
                          const offset = 80;
                          window.scrollTo({
                            top: portal.getBoundingClientRect().top + window.scrollY - offset,
                            behavior: "smooth"
                          });
                        }
                      }
                    }}
                    className={`w-full py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      p.popular 
                        ? "bg-brand-primary hover:bg-brand-primary/90 text-white hover:shadow-lg hover:shadow-brand-primary/20" 
                        : "bg-brand-surface-secondary hover:bg-brand-border text-brand-text-primary border border-brand-border shadow-sm"
                    }`}
                  >
                    <span>Activate {p.name} Profile</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
