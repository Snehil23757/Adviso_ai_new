import React from "react";
import {
  Sparkles,
  Cpu,
  Sliders,
  BarChart3,
  MessageSquare,
  Search,
  Bell,
  Shuffle,
} from "lucide-react";

export default function CoreFeatures() {
  const features = [
    {
      icon: Sparkles,
      title: "Context-Aware Recommendations",
      desc: "Generate tailored recommendations based on business size, industry, goals, and operational data."
    },
    {
      icon: Cpu,
      title: "Explainable AI",
      desc: "Every recommendation includes reasoning, supporting data points, and confidence scoring."
    },
    {
      icon: Sliders,
      title: "Decision Simulation Engine",
      desc: "Test pricing, hiring, inventory, and operational scenarios before making decisions."
    },
    {
      icon: BarChart3,
      title: "Smart Dashboards",
      desc: "Monitor KPIs, business performance, churn, revenue trends, and operational health in real time."
    },
    {
      icon: MessageSquare,
      title: "Conversational AI Interface",
      desc: "Ask business questions naturally and receive structured insights with actionable recommendations."
    },
    {
      icon: Search,
      title: "Automated Insight Detection",
      desc: "Detect anomalies, risks, opportunities, and operational inefficiencies automatically."
    },
    {
      icon: Bell,
      title: "Smart Alerts",
      desc: "Receive proactive alerts for financial risks, operational changes, and performance issues."
    },
    {
      icon: Shuffle,
      title: "Multi-Source Data Integration",
      desc: "Connect spreadsheets, CRMs, ERPs, payment systems, and analytics tools."
    }
  ];

  return (
    <section id="core-features" className="relative py-24 bg-black/10 overflow-hidden">
      <div className="absolute inset-0 subtle-grid opacity-10 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10 w-full text-center space-y-12">
        
        {/* Section Header */}
        <div className="max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-brand-primary">
            SYSTEM CAPABILITIES
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-sans leading-tight">
            Comprehensive Analytical Architecture
          </h2>
          <p className="text-sm text-brand-text-secondary leading-relaxed font-sans">
            Streamline operational oversight through specialized modular layers configured to analyze risk vectors and maximize decision accuracy.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
          {features.map((f, fIdx) => (
            <div
              key={fIdx}
              className="group relative rounded-2xl border border-white/5 bg-brand-surface/30 p-6 space-y-4 hover:border-brand-primary/30 transition-all hover:bg-brand-surface/40 hover:shadow-lg hover:shadow-brand-primary/5"
            >
              {/* Card top flare decor */}
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent group-hover:via-brand-primary/40 transition"></div>

              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition duration-300">
                <f.icon className="w-5 h-5" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white group-hover:text-brand-primary transition">
                  {f.title}
                </h3>
                <p className="text-xs text-brand-text-secondary leading-relaxed">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
