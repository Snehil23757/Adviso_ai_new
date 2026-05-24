import React, { useRef } from "react";
import { ArrowRight, Cpu, TrendingUp, CheckCircle2 } from "lucide-react";
import { motion, useMotionValue, useTransform } from "motion/react";

export default function Hero() {
  const scrollToPortal = () => {
    const portal = document.getElementById("strategy-portal");
    if (portal) {
      const offset = 80;
      const pos = portal.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: pos - offset, behavior: "smooth" });
    }
  };

  // 3D Tilt Effect Setup
  const cardRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-100, 100], [10, -10]);
  const rotateY = useTransform(x, [-100, 100], [-10, 10]);

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

  // Framer Motion Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
    },
  };

  const mockupVariants = {
    hidden: { opacity: 0, x: 50, scale: 0.95 },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: { duration: 1, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <section className="relative min-h-screen pt-32 pb-24 md:pb-32 flex items-center overflow-hidden bg-brand-background transition-colors duration-500">
      
      {/* Background Visual Enhancements & Grids */}
      <div className="absolute inset-0 subtle-grid opacity-30 pointer-events-none transition-opacity duration-500 bg-[length:32px_32px]"></div>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[90vw] md:w-[700px] h-[700px] radar-sweep rounded-full opacity-30 blur-[130px] pointer-events-none transition-colors duration-500 bg-brand-primary/10"></div>
      
      {/* Immersive 3D-like Glowing Spheres */}
      <div className="absolute -top-[10%] left-[10%] w-[35vw] h-[35vw] max-w-[500px] aspect-square rounded-full bg-gradient-to-tr from-brand-primary/10 to-indigo-500/5 blur-[110px] pointer-events-none animate-pulse duration-5000"></div>
      <div className="absolute bottom-[10%] -right-[5%] w-[40vw] h-[40vw] max-w-[600px] aspect-square rounded-full bg-gradient-to-br from-blue-500/10 to-brand-primary/5 blur-[130px] pointer-events-none"></div>

      <div className="w-full px-6 md:px-12 xl:px-24 mx-auto relative z-10 max-w-[2000px]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-12 xl:gap-20 items-center">
          
          {/* Left Side: Editorial Typography Copy with Framer Motion Integration */}
          <motion.div 
            className="lg:col-span-6 space-y-10 text-left"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div 
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-brand-primary/10 border border-brand-primary/25 text-brand-primary text-xs font-mono font-bold tracking-widest shadow-sm"
              variants={itemVariants}
            >
              <Cpu className="w-4 h-4 animate-spin-slow" />
              <span>EXPLAINABLE INTELLIGENCE LAYER</span>
            </motion.div>

            <motion.div className="space-y-6" variants={itemVariants}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-[4.5rem] font-black tracking-tight text-brand-text-primary leading-[1.05] drop-shadow-sm font-sans">
                Turn Business Data Into{" "}
                <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-blue-500">
                  Strategic Decisions
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-brand-text-secondary leading-relaxed max-w-xl font-sans opacity-95">
                Adviso AI helps startups, enterprise founders, and operational analysts transform scattered data into explainable AI-driven recommendations and actionable business intelligence.
              </p>
            </motion.div>

            {/* Premium CTA Buttons */}
            <motion.div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2" variants={itemVariants}>
              <motion.button
                onClick={scrollToPortal}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-brand-text-primary text-brand-background font-bold text-base px-8 py-4 rounded-xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer hover:shadow-2xl hover:opacity-90"
              >
                <span>Request Demo</span>
                <ArrowRight className="w-5 h-5" />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-transparent hover:bg-brand-surface/80 text-base font-bold text-brand-text-primary px-8 py-4 rounded-xl border border-brand-border transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <span>Explore Platform</span>
              </motion.button>
            </motion.div>

            {/* Mini features */}
            <motion.div className="pt-10 border-t border-brand-border" variants={itemVariants}>
              <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                {[
                  { title: "Explainable AI", desc: "Open, auditable algorithms" },
                  { title: "Real-time Insights", desc: "Constant stream analysis" },
                  { title: "Decision Intelligence", desc: "Strategic operational modeling" },
                  { title: "Scenario Simulation", desc: "Interactive cash runways" },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 group">
                    <div className="p-1 rounded bg-brand-primary/10 border border-brand-primary/20 mt-0.5 group-hover:bg-brand-primary/20 transition-colors">
                      <CheckCircle2 className="w-4 h-4 text-brand-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-brand-text-primary leading-none mb-1 group-hover:text-brand-primary transition-colors">{item.title}</h3>
                      <p className="text-xs text-brand-text-secondary leading-snug">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

          </motion.div>

          {/* Right Side: High-End Premium Decision Support Dashboard Mockup with spring animations */}
          <motion.div 
            className="lg:col-span-6 relative w-full flex justify-center lg:justify-end"
            variants={mockupVariants}
            initial="hidden"
            animate="visible"
          >
            
            {/* Ambient Back Glow Ring */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/20 to-indigo-500/15 rounded-[3rem] blur-3xl -m-6 animate-pulse opacity-40 transition-colors duration-500"></div>

            {/* Mockup Premium Container */}
            <motion.div 
              ref={cardRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
              className="w-full max-w-xl glass-panel rounded-3xl p-6 md:p-8 border border-brand-border relative shadow-2xl space-y-6 hover:border-brand-primary/30 transition-all duration-500 bg-brand-surface/40 backdrop-blur-xl"
            >
              
              {/* Header Controls Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-brand-border">
                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-rose-500/80"></span>
                    <span className="w-3.5 h-3.5 rounded-full bg-amber-500/80"></span>
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/80"></span>
                  </div>
                  <span className="text-[11px] font-mono text-brand-text-secondary uppercase tracking-widest pl-2">
                    ADVISO CORE V1.4
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-brand-primary bg-brand-primary/10 px-3 py-1 rounded-full border border-brand-primary/20">
                  ACTIVE CONTEXT
                </span>
              </div>

              {/* Simulated Highlight Indicators */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-brand-surface-secondary/50 p-4 rounded-2xl border border-brand-border shadow-sm">
                  <span className="text-[10px] font-mono font-bold text-brand-text-secondary uppercase tracking-widest">
                    RUNWAY STABILITY
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-black text-brand-text-primary">18.4 <span className="text-base text-brand-text-secondary font-medium">mo</span></span>
                    <span className="text-[11px] font-mono text-emerald-500 font-bold leading-none bg-emerald-500/10 px-1.5 py-0.5 rounded">+35%</span>
                  </div>
                </div>
                <div className="bg-brand-surface-secondary/50 p-4 rounded-2xl border border-brand-border shadow-sm">
                  <span className="text-[10px] font-mono font-bold text-brand-text-secondary uppercase tracking-widest">
                    DECISION CONFIDENCE
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-black rounded text-transparent bg-clip-text bg-gradient-to-br from-brand-primary to-blue-400">94.8%</span>
                    <span className="text-[11px] font-mono text-indigo-500 font-bold leading-none bg-indigo-500/10 px-1.5 py-0.5 rounded">ALPHA</span>
                  </div>
                </div>
              </div>

              {/* Interactive Chart Indicator Vector Graphic */}
              <div className="bg-brand-surface border border-brand-border rounded-2xl flex justify-end h-40 relative overflow-hidden group">
                 <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity font-mono text-[10px] uppercase tracking-widest text-brand-text-primary font-bold z-20">
                   Interactive Visualizer Locked
                 </div>
                
                 <svg className="w-full h-full relative z-10 group-hover:opacity-30 transition-opacity" viewBox="0 0 400 100" fill="none" preserveAspectRatio="none">
                  <path d="M 0 85 Q 100 75 200 45 T 400 15" stroke="var(--brand-primary)" strokeWidth="4" strokeLinecap="round" fill="none" />
                  <path d="M 0 85 Q 100 75 200 45 T 400 15 L 400 100 L 0 100 Z" fill="url(#heroGrad)" opacity="0.3" />
                  <line x1="0" y1="50" x2="400" y2="50" stroke="var(--brand-border)" strokeDasharray="4 4" strokeWidth="1"/>
                  <line x1="200" y1="0" x2="200" y2="100" stroke="var(--brand-border)" strokeDasharray="4 4" strokeWidth="1"/>
                  
                  {/* Glowing Marker */}
                  <circle cx="200" cy="45" r="6" fill="var(--brand-primary)" className="animate-pulse" style={{ transformOrigin: "200px 45px" }} />
                  <circle cx="200" cy="45" r="3" fill="#FFFFFF" />
                  
                  <defs>
                    <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* Dynamic AI Recommendation Widget Alert */}
              <div className="rounded-2xl border border-brand-primary/30 bg-brand-primary/5 p-5 space-y-3 hover:bg-brand-primary/10 transition-colors cursor-default shadow-sm relative overflow-hidden">
                <div className="absolute left-0 top-0 w-1 h-full bg-brand-primary opacity-80"></div>
                <div className="flex items-center justify-between text-xs font-mono font-bold text-brand-text-primary">
                  <span className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-brand-primary" /> RECOMMENDATION STRATEGY
                  </span>
                  <span className="bg-brand-text-primary text-brand-background px-2.5 py-1 rounded text-[10px]">
                    HIGH VELOCITY
                  </span>
                </div>
                <p className="text-sm text-brand-text-secondary leading-relaxed">
                  Reallocate 12% unused cloud-resource reserve credits from staging. <strong className="text-brand-text-primary font-medium">Increases runway by 2.4 months.</strong>
                </p>
              </div>

              {/* Floating Metric Indicator Badge decoration */}
              <motion.div 
                className="absolute -bottom-8 -right-6 md:-right-10 bg-brand-surface border border-brand-border rounded-xl p-4 shadow-2xl backdrop-blur-xl hidden sm:flex items-center gap-4"
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-mono font-bold text-brand-text-secondary uppercase tracking-widest leading-none">
                    PROFIT SQUEEZE
                  </span>
                  <span className="block text-sm font-bold text-brand-text-primary mt-1.5 leading-none">
                    +14.8% Projected
                  </span>
                </div>
              </motion.div>

            </motion.div>

          </motion.div>

        </div>
      </div>
    </section>
  );
}
