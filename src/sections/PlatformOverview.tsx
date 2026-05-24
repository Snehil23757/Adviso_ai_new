import React, { useRef } from "react";
import { CheckCircle2, ChevronRight, BarChart3, Fingerprint, Activity } from "lucide-react";
import { motion, useMotionValue, useTransform } from "motion/react";

export default function PlatformOverview() {
  const scrollToPortal = () => {
    const portal = document.getElementById("strategy-portal");
    if (portal) {
      const offset = 80;
      const pos = portal.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: pos - offset, behavior: "smooth" });
    }
  };

  // 3D Tilt Context Setup
  const cardRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-100, 100], [8, -8]);
  const rotateY = useTransform(x, [-100, 100], [-8, 8]);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;
    x.set(event.clientX - centerX);
    y.set(event.clientY - centerY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
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
      <div className="w-full px-6 md:px-12 xl:px-24 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center relative z-10 max-w-[2000px] mx-auto">
        
        {/* Left Side: Technical Copy layout with Framer Motion entry */}
        <motion.div 
          className="lg:col-span-6 space-y-6 text-left"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-brand-primary">
              PLATFORM DISCOVERY
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-brand-text-primary mt-2 leading-tight">
              A Unified AI Intelligence Layer For Business Operations
            </h2>
          </div>
          <p className="text-sm sm:text-base text-brand-text-secondary leading-relaxed font-sans">
            Adviso AI combines analytics, explainable AI, scenario simulation, and conversational intelligence into a single decision-support platform. Connect your corporate data channels directly into a structured analytical ledger.
          </p>

          {/* Grid items */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            {bullets.map((b, bIdx) => (
              <div key={bIdx} className="space-y-1 group">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-primary shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold text-brand-text-primary leading-none font-sans group-hover:text-brand-primary transition-colors">
                    {b.title}
                  </span>
                </div>
                <p className="text-xs text-brand-text-secondary pl-6 leading-relaxed font-sans">
                  {b.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-6">
            <button
              onClick={scrollToPortal}
              className="inline-flex items-center gap-2 text-sm font-bold text-brand-primary hover:text-brand-text-primary transition group cursor-pointer"
            >
              <span>Launch Live Intelligence Tool</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </motion.div>

        {/* Right Side: Graphical Platform Elements Layer */}
        <motion.div 
          className="lg:col-span-6 w-full flex justify-center"
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ type: "spring", stiffness: 80, damping: 20, delay: 0.2 }}
        >
          
          <motion.div 
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            className="w-full max-w-md bg-brand-surface border border-brand-border rounded-2xl p-6 relative space-y-4 shadow-xl hover:border-brand-primary/20 transition-all duration-300"
          >
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
                <div key={rIdx} className="flex items-center justify-between p-3 rounded-xl border border-brand-border bg-brand-surface-secondary hover:border-brand-primary/25 transition">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg ${row.bg} flex items-center justify-center ${row.color}`}>
                      <row.icon className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-brand-text-primary">
                        {row.label}
                      </span>
                      <span className="block text-[8px] font-mono text-brand-text-secondary">
                        LAYER_INDEX_0{rIdx + 1}
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono font-medium text-brand-text-secondary border border-brand-border px-2 py-0.5 rounded uppercase">
                    {row.status}
                  </span>
                </div>
              ))}
            </div>

            {/* Simulated terminal response stream */}
            <div className="bg-brand-surface-secondary rounded-xl p-3 border border-brand-border font-mono text-[10px] space-y-1 text-brand-text-secondary leading-normal">
              <div className="text-brand-text-primary font-semibold flex items-center justify-between">
                <span>Console Stream Diagnostics</span>
                <span className="text-[9px] text-[#A0AEC0]">SECURE SHELL</span>
              </div>
              <div className="border-t border-brand-border my-1.5"></div>
              <p className="text-brand-primary">root@adviso-ai:~# query --indicators-analysis --verbose</p>
              <p>{"[SUCCESS] Loaded 4 core indicators matching logistics trends."}</p>
              <p>{"[SUCCESS] Strategic score set to 85 indices."}</p>
              <p className="text-emerald-400">{"[PROCESS] Tactical roadmap compiled accurately."}</p>
            </div>

          </motion.div>

        </motion.div>

      </div>
    </section>
  );
}
