import React from "react";
import { Shield, Key, EyeOff, ClipboardList, Lock, FileSearch } from "lucide-react";

export default function Security() {
  const securityPillars = [
    {
      icon: Lock,
      title: "Data Privacy First Architecture",
      desc: "All quantitative parameters ingested are processed in isolated server sessions. We do not persist raw or identifying user transaction logs."
    },
    {
      icon: Key,
      title: "Encrypted Data Handling",
      desc: "Secure SSL/TLS layers wrap every outbound API transaction. Secret tokens and credentials are encrypted using robust server-side algorithms."
    },
    {
      icon: EyeOff,
      title: "Secure Integrations",
      desc: "Data sync channels with financial Ledgers and SaaS processors use restricted read-only scope permissions, preserving master record security."
    },
    {
      icon: ClipboardList,
      title: "Audit Trails",
      desc: "System metrics, simulation parameters, and compiled strategic output logs are structured with cryptographic timestamps for simple auditing."
    },
    {
      icon: FileSearch,
      title: "Role-Based Access Controls",
      desc: "Define strict permissions structures so that strategic advisory outputs are only queryable by authoritative team executives."
    },
    {
      icon: Shield,
      title: "Explainable Data Security",
      desc: "No machine learning optimization model decision occurs without clear, visible numerical confidence scoring metrics to verify outputs."
    }
  ];

  return (
    <section id="security" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 subtle-grid opacity-10 pointer-events-none"></div>

      <div className="w-full px-6 md:px-12 xl:px-24 mx-auto relative z-10 space-y-16 max-w-[2000px]">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#4A63FF]">
            COMPLIANCE GUARANTEE
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-brand-text-primary font-sans leading-tight">
            Enterprise Grade Data Containment Framework
          </h2>
          <p className="text-sm text-brand-text-secondary leading-relaxed">
            Ensure absolute security with structural processing components designed from the ground up to support strict business analytical privacy.
          </p>
        </div>

        {/* Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
          {securityPillars.map((p, pIdx) => (
            <div key={pIdx} className="bg-brand-surface/30 rounded-2xl border border-brand-border p-6 hover:border-brand-primary/20 hover:bg-brand-surface/40 transition-all duration-300 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                <p.icon className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-brand-text-primary font-sans">
                  {p.title}
                </h3>
                <p className="text-xs text-brand-text-secondary leading-relaxed">
                  {p.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
