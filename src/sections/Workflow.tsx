import React from "react";
import {
  Link,
  Activity,
  SearchCode,
  Fingerprint,
  Sliders,
  Send,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

export default function Workflow() {
  const steps = [
    {
      num: "01",
      icon: Link,
      title: "Connect Data",
      desc: "Connect spreadsheets, CRMs, ERPs, payment systems, and analytics tools securely."
    },
    {
      num: "02",
      icon: Activity,
      title: "Analyze Operations",
      desc: "Our continuous ingestion engine maps indicators and flags critical operational bottlenecks."
    },
    {
      num: "03",
      icon: SearchCode,
      title: "Generate Insights",
      desc: "Process multi-variable data fields through advanced contextual algorithms."
    },
    {
      num: "04",
      icon: Fingerprint,
      title: "Explain Recommendations",
      desc: "Every recommendation is synthesized with structured, audit-ready confidence multipliers."
    },
    {
      num: "05",
      icon: Sliders,
      title: "Simulate Scenarios",
      desc: "Interact with numerical toggles to test price hikes or marketing investments before deploying."
    },
    {
      num: "06",
      icon: Send,
      title: "Take Action",
      desc: "Formulate interactive playbooks and checklists to guide operational execution securely."
    }
  ];

  return (
    <section id="workflow" className="relative py-24 bg-black/10 overflow-hidden">
      <div className="absolute inset-0 subtle-grid opacity-10 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10 w-full space-y-12 text-center">
        
        {/* Header */}
        <div className="max-w-xl mx-auto space-y-3">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-brand-primary">
            OPERATIONAL PIPELINE
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            The Continuous Decision Loop
          </h2>
          <p className="text-sm text-brand-text-secondary leading-relaxed">
            Move seamlessly from fragmented raw logs and manual tables to validated, explainable strategic initiatives.
          </p>
        </div>

        {/* Steps Grid Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 relative">
          
          {/* Connector lines (rendered only on desktop viewport size) */}
          <div className="hidden lg:block absolute top-[52px] left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-brand-primary/10 via-brand-primary/40 to-brand-primary/10 z-0"></div>

          {steps.map((step, idx) => (
            <div key={idx} className="relative z-10 flex flex-col items-center text-center space-y-4 group">
              
              {/* Step indicator circle */}
              <div className="w-16 h-16 rounded-full bg-brand-surface border border-white/10 group-hover:border-brand-primary flex items-center justify-center text-brand-text-secondary group-hover:text-brand-primary transition duration-300 relative shadow-lg">
                <step.icon className="w-5 h-5 stroke-[2]" />
                
                {/* Small indicator badge */}
                <span className="absolute -top-1 -right-1 bg-brand-primary/10 border border-brand-primary/25 rounded-md px-1.5 py-0.5 text-[8px] font-mono font-extrabold text-brand-primary shrink-0 leading-none">
                  {step.num}
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white tracking-tight leading-snug group-hover:text-brand-primary transition">
                  {step.title}
                </h3>
                <p className="text-[11px] text-brand-text-secondary leading-relaxed max-w-[200px] mx-auto">
                  {step.desc}
                </p>
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
