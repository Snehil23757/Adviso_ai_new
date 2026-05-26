import React from "react";
import { Sparkles, ArrowRight, MessageSquareCode, Mail } from "lucide-react";

export default function FinalCTA() {
  const scrollToPortal = () => {
    const portal = document.getElementById("strategy-portal");
    if (portal) {
      const offset = 80;
      const pos = portal.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: pos - offset, behavior: "smooth" });
    }
  };

  return (
    <section id="contact" className="relative py-24 overflow-hidden border-t border-brand-border">
      {/* Background Visual Grids and Auras */}
      <div className="absolute inset-0 subtle-grid opacity-15 pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] radar-sweep rounded-full opacity-35 blur-[120px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto px-6 relative z-10 w-full text-center space-y-8">
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/25 text-brand-primary text-xs font-mono font-medium tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>START COMPILING STRATEGY</span>
        </div>

        <div className="space-y-4 max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-brand-text-primary font-sans leading-tight">
            Build Smarter Business Decisions With Adviso AI
          </h2>
          <p className="text-sm sm:text-base text-brand-text-secondary leading-relaxed font-sans">
            Transform operational data into explainable strategic intelligence. Align your board metrics with robust context-aware recommendation reports.
          </p>
        </div>

        {/* CTA triggers */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            type="button"
            onClick={scrollToPortal}
            className="bg-brand-primary hover:bg-brand-primary/95 text-sm font-bold text-brand-inverse px-8 py-4 rounded-xl shadow-lg shadow-brand-primary/20 transition hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
          >
            <span>Ask Strategic Advisor Live</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <a
            href="mailto:partner@advisoadvisor.co"
            className="bg-brand-text-primary hover:bg-brand-text-primary/90 text-sm font-bold text-brand-inverse px-8 py-4 rounded-xl border border-brand-border transition hover:-translate-y-0.5 flex items-center justify-center gap-2 w-full sm:w-auto text-center"
          >
            <Mail className="w-4 h-4" />
            <span>Contact Core Sales Team</span>
          </a>
        </div>

        {/* Core footer declaration notes */}
        <p className="text-[10px] font-mono text-brand-text-secondary uppercase tracking-widest pt-2">
          SECURED VIA TOKENIZED SHARED DATA LAYERS
        </p>

      </div>
    </section>
  );
}
