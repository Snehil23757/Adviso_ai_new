import React from "react";
import { ShieldCheck, Cpu, Database, Landmark, Percent, Timer } from "lucide-react";

export default function Trust() {
  return (
    <section id="trust-metrics" className="relative py-16 border-t border-b border-brand-border bg-brand-surface-secondary overflow-hidden">
      <div className="absolute inset-0 subtle-grid opacity-10 pointer-events-none"></div>

      <div className="w-full px-6 md:px-12 xl:px-24 mx-auto max-w-[2000px]">
        {/* Statistics Row Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 text-center">
          
          <div className="space-y-2 p-4">
            <div className="w-10 h-10 mx-auto rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
              <Percent className="w-5 h-5" />
            </div>
            <div className="text-4xl lg:text-5xl font-black text-brand-text-primary font-sans tracking-tight">
              95%
            </div>
            <p className="text-xs font-mono text-brand-text-secondary uppercase tracking-widest leading-normal">
              Faster Decision Cycles
            </p>
            <p className="text-xs text-brand-text-secondary max-w-xs mx-auto">
              Automated data pipeline extraction collapses multi-week manual coordination down to seconds.
            </p>
          </div>

          <div className="space-y-2 p-4 border-y md:border-y-0 md:border-x border-brand-border">
            <div className="w-10 h-10 mx-auto rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
              <Timer className="w-5 h-5" />
            </div>
            <div className="text-4xl lg:text-5xl font-black text-brand-text-primary font-sans tracking-tight">
              40%
            </div>
            <p className="text-xs font-mono text-brand-text-secondary uppercase tracking-widest leading-normal">
              Reduction in Manual Analysis Time
            </p>
            <p className="text-xs text-brand-text-secondary max-w-xs mx-auto">
              Saves analysts valuable resource hours previously spent on raw extraction and report synthesis.
            </p>
          </div>

          <div className="space-y-2 p-4">
            <div className="w-10 h-10 mx-auto rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-4xl lg:text-5xl font-black text-brand-text-primary font-sans tracking-tight">
              Zero
            </div>
            <p className="text-xs font-mono text-brand-text-secondary uppercase tracking-widest leading-normal">
              Black-Box Decision Elements
            </p>
            <p className="text-xs text-brand-text-secondary max-w-xs mx-auto">
              Every single output is tied back directly to clear quantitative parameters for transparent auditability.
            </p>
          </div>

        </div>

        {/* Brand Pillars Minimal Row */}
        <div className="flex flex-wrap items-center justify-center gap-y-6 gap-x-8 lg:gap-x-12 pt-8 border-t border-brand-border">
          <div className="flex items-center gap-2 text-brand-text-secondary hover:text-brand-text-primary transition">
            <ShieldCheck className="w-4 h-4 text-brand-primary" />
            <span className="text-xs font-mono font-medium tracking-wide uppercase">Secure Architecture</span>
          </div>
          <div className="flex items-center gap-2 text-brand-text-secondary hover:text-brand-text-primary transition">
            <Cpu className="w-4 h-4 text-brand-primary" />
            <span className="text-xs font-mono font-medium tracking-wide uppercase">AI Explainability</span>
          </div>
          <div className="flex items-center gap-2 text-brand-text-secondary hover:text-brand-text-primary transition">
            <Database className="w-4 h-4 text-brand-primary" />
            <span className="text-xs font-mono font-medium tracking-wide uppercase">Enterprise-grade Infrastructure</span>
          </div>
          <div className="flex items-center gap-2 text-brand-text-secondary hover:text-brand-text-primary transition">
            <Landmark className="w-4 h-4 text-brand-primary" />
            <span className="text-xs font-mono font-medium tracking-wide uppercase">Data Privacy Focus</span>
          </div>
        </div>

      </div>
    </section>
  );
}
