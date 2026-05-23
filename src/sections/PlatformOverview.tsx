import React from "react";
import { CheckCircle2, ChevronRight, BarChart3, Fingerprint, Activity, Inbox } from "lucide-react";

export default function PlatformOverview() {
  const scrollToPortal = () => {
    const portal = document.getElementById("strategy-portal");
    if (portal) {
      const offset = 80;
      const pos = portal.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: pos - offset, behavior: "smooth" });
    }
  };

  const bullets = [
    { title: "Context-aware recommendations", desc: "Formulated using specific industry vectors, seasonal fluctuations, and operational criteria." },
    { title: "Explainable AI insights", desc: "No opaque reasoning. Every decision outputs supporting financial margins and quantitative justifications." },
    { title: "Automated KPI analysis", desc: "Continuous mapping of product sales volume overlays, warehousing assets, and run rates." },
    { title: "Conversational business intelligence", desc: "Interconnect scattered databases into conversational structured strategic files." },
    { title: "Strategic forecasting", desc: "Rigorous forward-looking index calculations targeting four-quarter operational stability." },
    { title: "What-if simulations", desc: "Review visual margins prior to reallocating marketing, staffing, or inventory investments." },
  ];

  return (
    <section id="platform-overview" className="relative py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10 w-full">
        
        {/* Left Side: Technical Copy layout */}
        <div className="lg:col-span-6 space-y-6 text-left">
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-brand-primary">
              PLATFORM DISCOVERY
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mt-2 leading-tight">
              A Unified AI Intelligence Layer For Business Operations
            </h2>
          </div>
          <p className="text-sm sm:text-base text-brand-text-secondary leading-relaxed font-sans">
            Adviso AI combines analytics, explainable AI, scenario simulation, and conversational intelligence into a single decision-support platform. Connect your corporate data channels directly into a structured analytical ledger.
          </p>

          {/* Grid items */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            {bullets.map((b, bIdx) => (
              <div key={bIdx} className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-primary shrink-0" />
                  <span className="text-sm font-bold text-white leading-none font-sans">
                    {b.title}
                  </span>
                </div>
                <p className="text-xs text-brand-text-secondary pl-6 leading-relaxed">
                  {b.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-6">
            <button
              onClick={scrollToPortal}
              className="inline-flex items-center gap-2 text-sm font-bold text-brand-primary hover:text-white transition group cursor-pointer"
            >
              <span>Launch Live Intelligence Tool</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Right Side: Graphical Platform Elements Layer */}
        <div className="lg:col-span-6 w-full flex justify-center">
          
          <div className="w-full max-w-md bg-brand-surface border border-white/5 rounded-2xl p-6 relative space-y-4 shadow-xl">
            {/* Header decor */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-brand-text-secondary uppercase tracking-wider">
                CORE UTILITIES ORCHESTRATION
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-brand-primary animate-pulse"></span>
            </div>

            {/* Visual rows showing the interaction flow */}
            <div className="space-y-3">
              {[
                { icon: BarChart3, label: "Quantitative Data Ingestion", status: "Active Connected", color: "text-brand-primary", bg: "bg-brand-primary/10" },
                { icon: Fingerprint, label: "Explainable Core Sifting", status: "98.2% Accurate", color: "text-brand-primary", bg: "bg-brand-primary/10" },
                { icon: Activity, label: "Forward What-If Simulations", status: "Ready", color: "text-brand-primary", bg: "bg-brand-primary/10" },
              ].map((row, rIdx) => (
                <div key={rIdx} className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-black/40 hover:border-brand-primary/25 transition">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg ${row.bg} flex items-center justify-center ${row.color}`}>
                      <row.icon className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-white">
                        {row.label}
                      </span>
                      <span className="block text-[8px] font-mono text-brand-text-secondary">
                        LAYER_INDEX_0{rIdx + 1}
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono font-medium text-brand-text-secondary border border-white/10 px-2 py-0.5 rounded uppercase">
                    {row.status}
                  </span>
                </div>
              ))}
            </div>

            {/* Simulated terminal response stream */}
            <div className="bg-black/60 rounded-xl p-3 border border-white/5 font-mono text-[10px] space-y-1 text-brand-text-secondary leading-normal">
              <div className="text-white font-semibold flex items-center justify-between">
                <span>Console Stream Diagnostics</span>
                <span className="text-[9px] text-[#A0AEC0]">SECURE SHELL</span>
              </div>
              <div className="border-t border-white/5 my-1.5"></div>
              <p className="text-brand-primary">root@adviso-ai:~# query --indicators-analysis --verbose</p>
              <p>{"[SUCCESS] Loaded 4 core indicators matching logistics trends."}</p>
              <p>{"[SUCCESS] Strategic score set to 85 indices."}</p>
              <p className="text-emerald-400">{"[PROCESS] Tactical roadmap compiled accurately."}</p>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
