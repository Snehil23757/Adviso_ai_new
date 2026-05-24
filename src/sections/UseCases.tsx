import React, { useState } from "react";
import {
  FileText,
  Rocket,
  ShieldCheck,
  User,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Inbox,
  Workflow,
  Zap,
} from "lucide-react";

type UseCaseKey = "MSMEs" | "Startups" | "Founders" | "Business Analysts";

export default function UseCases() {
  const [activeTab, setActiveTab] = useState<UseCaseKey>("Startups");

  const tabConfigs = {
    MSMEs: {
      headline: "Enterprise-Level Intelligence For Growing Businesses",
      description: "Optimize margins and prevent cash crunches using contextual insights configured for real-world merchants and expanding local ventures.",
      points: [
        "Inventory optimization: Align stock turnover with seasonal demands.",
        "Cost reduction recommendations: Highlight high-friction administrative vendors.",
        "Pricing intelligence: Dynamically model margins based on competitor price indexes.",
        "Cash flow visibility: Run predictive simulations to visualize forthcoming runway bottlenecks.",
        "Operational insights: Highlight operational metrics matching physical retail norms."
      ],
      panelHeader: "LOCAL INVENTORY & CASH PERFORMANCE",
      visual: (
        <div className="space-y-4">
          <div className="bg-brand-surface-secondary p-4 rounded-xl border border-brand-border space-y-3">
            <div className="flex justify-between items-center text-[10px] font-mono text-brand-text-secondary">
              <span>STOCK VELOCITY OVERLAY</span>
              <span className="text-emerald-400 font-bold">OPTIMIZED</span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs text-brand-text-primary mb-1">
                  <span>Fast-Velocity Goods (SKU 11a)</span>
                  <span>78% capacity turnover</span>
                </div>
                <div className="w-full h-2 bg-brand-text-primary rounded-full overflow-hidden">
                  <div className="w-[78%] h-full bg-brand-primary"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-brand-text-primary mb-1">
                  <span>Slower Buffer Stock (SKU 42z)</span>
                  <span>14% turnover</span>
                </div>
                <div className="w-full h-2 bg-brand-text-primary rounded-full overflow-hidden">
                  <div className="w-[14%] h-full bg-brand-primary/40"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/20 flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs text-emerald-300">
              System alert: Reallocating buffer capital to fast SKUs projects a 12% revenue optimization.
            </span>
          </div>
        </div>
      )
    },
    Startups: {
      headline: "Move Faster With Data-Driven Execution",
      description: "Align compound product-market matrices and validate growth vectors prior to capital expenditure campaigns.",
      points: [
        "Product-market fit analysis: Continuously monitor cohort retention curves.",
        "Growth experiment recommendations: Rank campaigns using impact and velocity parameters.",
        "User behavior insights: Highlight product bottlenecks causing high dropoffs.",
        "Burn rate tracking: Formulate operational stability indexes for capital allocators.",
        "Strategic prioritization: Leverage data indicators to optimize roadmap execution."
      ],
      panelHeader: "COHORT RETENTION & BURN PROFILES",
      visual: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-brand-surface-secondary p-3 rounded-xl border border-brand-border text-center">
              <span className="block text-[8px] font-mono text-brand-text-secondary uppercase">MONTHLY EXPENSES</span>
              <span className="block text-lg font-bold text-brand-text-primary mt-1">$22,000</span>
              <span className="inline-block px-1.5 py-0.5 bg-rose-500/10 text-rose-400 text-[9px] font-mono rounded mt-1">CAP RUNWAY</span>
            </div>
            <div className="bg-brand-surface-secondary p-3 rounded-xl border border-brand-border text-center">
              <span className="block text-[8px] font-mono text-brand-text-secondary uppercase">RETENTION CAPABILITY</span>
              <span className="block text-lg font-bold text-brand-primary mt-1">68.4%</span>
              <span className="inline-block px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-mono rounded mt-1">OPTIMAL FIT</span>
            </div>
          </div>
          <div className="bg-brand-surface-secondary p-4 rounded-xl border border-brand-border space-y-1.5">
            <span className="text-[9px] font-mono text-brand-text-secondary uppercase">COHORT RETENTION INDEX</span>
            <div className="h-20 flex items-end gap-1.5 pt-2">
              {[45, 52, 60, 68, 68, 72, 85].map((val, idx) => (
                <div key={idx} className="flex-1 bg-brand-primary rounded-t" style={{ height: `${val}%` }}></div>
              ))}
            </div>
            <div className="flex justify-between text-[9px] font-mono text-brand-text-secondary pt-1">
              <span>Wk 1</span>
              <span>Wk 4</span>
              <span>Wk 8</span>
            </div>
          </div>
        </div>
      )
    },
    Founders: {
      headline: "Strategic Decision Support For Leadership Teams",
      description: "Empower business orchestrators with unified operational reporting files that enhance board alignment and reduce planning bottlenecks.",
      points: [
        "High-level business intelligence: Consolidate isolated systems into strategic dashboards.",
        "Forecasting and planning: Automatically synthesize multi-variable business models.",
        "Opportunity intelligence: Detect shifting customer preferences and segment niches.",
        "Risk monitoring: Proactively track competitors and operating cost variables.",
        "Scenario simulation: Test large pricing, hiring, and capital moves before committing."
      ],
      panelHeader: "VALUATION & CAPITAL SIMULATOR",
      visual: (
        <div className="space-y-4">
          <div className="bg-brand-surface-secondary p-4 rounded-xl border border-brand-border space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-brand-text-primary">
                <span>Strategic Priority Core</span>
                <span className="font-mono text-brand-primary">75% Growth Focus</span>
              </div>
              <div className="w-full h-1 bg-brand-text-primary rounded-full overflow-hidden">
                <div className="w-3/4 h-full bg-brand-primary"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-brand-text-primary">
                <span>Capital Sourcing Matrix</span>
                <span className="font-mono text-emerald-400">25% Profit focus</span>
              </div>
              <div className="w-full h-1 bg-brand-text-primary rounded-full overflow-hidden">
                <div className="w-1/4 h-full bg-emerald-400"></div>
              </div>
            </div>
          </div>
          <div className="bg-brand-text-primary p-3 rounded-lg border border-brand-border text-xs text-brand-text-secondary leading-relaxed">
            Founders dashboard integrates custom cash reserves constraints directly with sales forecast sheets to coordinate boards.
          </div>
        </div>
      )
    },
    "Business Analysts": {
      headline: "Reduce Manual Analysis And Improve Decision Accuracy",
      description: "Eliminate repetitive spreadsheet formulation and accelerate report delivery using direct context-aware data extraction systems.",
      points: [
        "Automated reporting: Create corporate decision decks compiled instantly.",
        "KPI analysis: Track sales pipeline volumes and cost trends dynamically.",
        "Trend detection: Automatically spot hidden customer purchase changes.",
        "Insight generation: Match operational anomalies with business actions.",
        "Explainable recommendations: Back recommendations with audit-ready quantitative justification."
      ],
      panelHeader: "ANALYST EXTRACTION PIPELINE",
      visual: (
        <div className="space-y-4">
          <div className="bg-brand-surface-secondary p-4 rounded-xl border border-brand-border space-y-3">
            <span className="text-[9px] font-mono text-brand-text-secondary uppercase">DATA INTEGRATION SOURCES</span>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="p-2 bg-brand-text-primary rounded border border-brand-border text-brand-text-primary flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                <span>Sales Ledger.csv</span>
              </div>
              <div className="p-2 bg-brand-text-primary rounded border border-brand-border text-brand-text-primary flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                <span>Stripe Payouts</span>
              </div>
              <div className="p-2 bg-brand-text-primary rounded border border-brand-border text-brand-text-primary flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>
                <span>QuickBooks API</span>
              </div>
              <div className="p-2 bg-brand-text-primary rounded border border-brand-border text-brand-text-primary flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></div>
                <span>CRM Pipeline Sync</span>
              </div>
            </div>
          </div>
          <span className="block text-[10px] text-brand-primary text-center font-mono font-bold hover:underline cursor-pointer">
            SYNC ALL SECURE EXTENSIONS
          </span>
        </div>
      )
    }
  };

  const currentTab = tabConfigs[activeTab];

  return (
    <section id="use-cases" className="relative py-24 overflow-hidden">
      <div className="w-full px-6 md:px-12 xl:px-24 relative z-10 space-y-16 max-w-[2000px] mx-auto">
        
        {/* Section Title */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-brand-primary">
            ADDIENCY SEGMENTS
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-brand-text-primary leading-tight">
            Engineered For Every Business Operational Profile
          </h2>
          <p className="text-sm text-brand-text-secondary max-w-lg mx-auto">
            Review detailed decision playbooks and analytical indicators tailored automatically for your corporate role.
          </p>
        </div>

        {/* Tab Selection Bar (Responsive grid structure) */}
        <div className="flex flex-wrap items-center justify-center gap-2 border-b border-brand-border pb-2">
          {(Object.keys(tabConfigs) as UseCaseKey[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 rounded-t-xl text-sm font-semibold transition cursor-pointer relative ${
                  isActive 
                    ? "text-brand-primary bg-brand-surface/20" 
                    : "text-brand-text-secondary hover:text-brand-text-primary"
                }`}
              >
                {tab}
                {isActive && (
                  <div className="absolute bottom-0 left-0 w-full h-[2px] bg-brand-primary"></div>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Detail panel (Two grids) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center bg-brand-surface/10 rounded-2xl border border-brand-border p-6 lg:p-10">
          
          {/* Left Column: Descriptions and actions */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div>
              <span className="text-[10px] font-mono text-brand-primary font-bold uppercase tracking-widest block mb-2">
                SOLUTION MATRIX PROFILE
              </span>
              <h3 className="text-2xl font-bold text-brand-text-primary tracking-tight leading-tight">
                {currentTab.headline}
              </h3>
            </div>
            <p className="text-sm text-brand-text-secondary leading-relaxed">
              {currentTab.description}
            </p>

            {/* List items */}
            <div className="space-y-3.5 pt-2">
              {currentTab.points.map((pt, index) => {
                const parts = pt.split(": ");
                return (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-brand-primary mt-0.5 shrink-0" />
                    <span className="text-xs leading-relaxed text-brand-text-primary">
                      <strong className="text-brand-primary">{parts[0]}</strong>: {parts[1]}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-4">
              <button 
                onClick={() => {
                  const portal = document.getElementById("strategy-portal");
                  if (portal) {
                    const offset = 80;
                    window.scrollTo({
                      top: portal.getBoundingClientRect().top + window.scrollY - offset,
                      behavior: "smooth"
                    });
                  }
                }}
                className="bg-brand-primary hover:bg-brand-primary/95 text-xs font-bold text-brand-text-primary px-5 py-3 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>Process Role Criteria</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right Column: Custom interactive graphic visual */}
          <div className="lg:col-span-5 w-full">
            <div className="rounded-xl border border-brand-border bg-brand-surface-secondary p-5 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-brand-border pb-3 mb-4">
                <span className="text-[9px] font-mono text-brand-text-secondary uppercase tracking-wider">
                  {currentTab.panelHeader}
                </span>
                <span className="text-[9px] font-mono text-brand-primary font-bold">LIVE MATRIX EMULATOR</span>
              </div>
              
              {currentTab.visual}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
