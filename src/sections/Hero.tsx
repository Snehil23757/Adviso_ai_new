import React from "react";
import { Sparkles, ArrowRight, ShieldCheck, Cpu, Sliders, TrendingUp, CheckCircle2 } from "lucide-react";

export default function Hero() {
  const scrollToPortal = () => {
    const portal = document.getElementById("strategy-portal");
    if (portal) {
      const offset = 80;
      const pos = portal.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: pos - offset, behavior: "smooth" });
    }
  };

  const scrollToOverview = () => {
    const target = document.getElementById("platform-overview");
    if (target) {
      const offset = 80;
      const pos = target.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: pos - offset, behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-screen pt-32 pb-20 flex items-center overflow-hidden">
      
      {/* Background visual components */}
      <div className="absolute inset-0 subtle-grid opacity-30 pointer-events-none"></div>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] radar-sweep rounded-full opacity-50 blur-[130px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10 w-full">
        
        {/* Left Side: Editorial Typography Copy */}
        <div className="lg:col-span-6 space-y-8 text-left">
          
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/25 text-brand-primary text-xs font-mono font-medium tracking-wider">
            <Cpu className="w-3.5 h-3.5" />
            <span>EXPLAINABLE INTELLIGENCE LAYER</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1] font-sans">
              Turn Business Data Into
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-[#4A63FF] to-sky-400">
                Strategic Decisions
              </span>
            </h1>
            <p className="text-base sm:text-lg text-brand-text-secondary leading-relaxed max-w-xl font-sans">
              Adviso AI helps startups, MSMEs, founders, and analysts transform scattered data into explainable AI-driven recommendations and actionable business intelligence.
            </p>
          </div>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <button
              onClick={scrollToPortal}
              className="bg-brand-primary hover:bg-brand-primary/95 text-sm font-bold text-white px-8 py-4 rounded-xl shadow-lg shadow-brand-primary/20 transition hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Request Demo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={scrollToOverview}
              className="bg-white/5 hover:bg-white/10 text-sm font-bold text-white px-8 py-4 rounded-xl border border-white/10 transition hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Explore Platform</span>
            </button>
          </div>

          {/* Social Proof Trust list (No em dashes or emojis) */}
          <div className="pt-6 border-t border-white/5">
            <div className="grid grid-cols-2 gap-4">
              {[
                { title: "Explainable AI", desc: "No white-box algorithms" },
                { title: "Real-time Insights", desc: "Constant stream analysis" },
                { title: "Decision Intelligence", desc: "Strategic operational modeling" },
                { title: "Scenario Simulation", desc: "Simulate cash runways" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-brand-primary mt-0.5 shrink-0" />
                  <div>
                    <span className="block text-xs font-bold text-white font-sans">
                      {item.title}
                    </span>
                    <span className="block text-[10px] text-brand-text-secondary font-mono mt-0.5 uppercase tracking-wide">
                      {item.desc}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Side: High-End Premium Decision Support Dashboard Preview */}
        <div className="lg:col-span-6 relative w-full flex justify-center">
          
          {/* Glowing Aura Ring */}
          <div className="absolute inset-0 bg-brand-primary/10 rounded-3xl blur-2xl -m-6 animate-pulse opacity-40"></div>

          {/* Primary Mockup Glass Frame */}
          <div className="w-full max-w-lg glass-panel rounded-2xl p-5 border border-white/10 relative shadow-2xl space-y-4">
            
            {/* Header controls bar */}
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500/40"></span>
                  <span className="w-3 h-3 rounded-full bg-amber-500/40"></span>
                  <span className="w-3 h-3 rounded-full bg-emerald-500/40"></span>
                </div>
                <span className="text-[10px] font-mono text-brand-text-secondary uppercase tracking-widest pl-2">
                  ADVISO CORE V1.4
                </span>
              </div>
              <span className="text-[10px] font-mono text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded border border-brand-primary/20">
                ACTIVE PIPELINE CONTEXT
              </span>
            </div>

            {/* Simulated Main KPI */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] font-mono text-brand-text-secondary uppercase tracking-widest">
                  RUNWAY STABILITY
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-bold text-white">18.4 Months</span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold leading-none">+35%</span>
                </div>
              </div>
              <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] font-mono text-[#A0AEC0] uppercase tracking-widest">
                  DECISION CONFIDENCE
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-bold text-brand-primary">94.8%</span>
                  <span className="text-[10px] font-mono text-indigo-400 font-bold leading-none">ALPHA</span>
                </div>
              </div>
            </div>

            {/* Interactive Graph Indicator Visual */}
            <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex flex-col justify-end h-32 relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center opacity-10 font-mono text-[9px] select-none uppercase tracking-widest">
                MODEL COMPILING SIMULATION RUNS
              </div>
              
              {/* Minimalist Grid lines with responsive SVG graph */}
              <svg className="w-full h-full relative z-10" viewBox="0 0 400 100" fill="none" preserveAspectRatio="none">
                <path d="M 0 85 Q 100 70 200 45 T 400 15" stroke="#4A63FF" strokeWidth="3" fill="none" />
                <path d="M 0 85 Q 100 70 200 45 T 400 15 L 400 100 L 0 100 Z" fill="url(#heroGrad)" opacity="0.1" />
                <line x1="0" y1="50" x2="400" y2="50" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3"/>
                <line x1="200" y1="0" x2="200" y2="100" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3"/>
                <circle cx="200" cy="45" r="4" fill="#4a63ff" />
                <defs>
                  <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4A63FF" />
                    <stop offset="100%" stopColor="#4A63FF" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Dynamic AI Recommendation Widget Alert */}
            <div className="rounded-xl border border-brand-primary/20 bg-brand-primary/5 p-3.5 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-brand-primary font-bold">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" /> RECOMMENDATION STRATEGY
                </span>
                <span className="bg-brand-primary/10 px-2 py-0.5 rounded text-brand-primary">
                  HIGH VELOCITY
                </span>
              </div>
              <p className="text-xs text-white leading-relaxed">
                Reallocate 12% unused computing reserve credits from lower pipeline integrations. This increases capital runway by 2.4 months with zero product slowdown.
              </p>
            </div>

            {/* Floating metric indicator decoration */}
            <div className="absolute -bottom-6 -right-6 bg-brand-surface border border-white/10 rounded-xl p-3 shadow-xl backdrop-blur-md hidden sm:flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[8px] font-mono text-brand-text-secondary uppercase tracking-widest leading-none">
                  MARGIN INCREASE
                </span>
                <span className="block text-sm font-bold text-[#FFFFFF] mt-0.5 leading-none">
                  +14.8% Projected
                </span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
