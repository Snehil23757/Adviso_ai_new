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
import { motion } from "motion/react";

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 15 },
    },
  };

  return (
    <section id="core-features" className="relative py-24 bg-brand-surface-secondary overflow-hidden">
      <div className="absolute inset-0 subtle-grid opacity-10 pointer-events-none"></div>

      <div className="w-full px-6 md:px-12 xl:px-24 relative z-10 text-center space-y-16 max-w-[2000px] mx-auto">
        
        {/* Section Header */}
        <div className="max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-brand-primary">
            SYSTEM CAPABILITIES
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-brand-text-primary font-sans leading-tight">
            Comprehensive Analytical Architecture
          </h2>
          <p className="text-sm text-brand-text-secondary leading-relaxed font-sans">
            Streamline operational oversight through specialized modular layers configured to analyze risk vectors and maximize decision accuracy.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {features.map((f, fIdx) => (
            <motion.div
              key={fIdx}
              className="group relative rounded-2xl border border-brand-border bg-brand-surface/30 p-6 space-y-4 hover:border-brand-primary/30 transition-all hover:bg-brand-surface/40 hover:shadow-lg hover:shadow-brand-primary/5 cursor-pointer"
              variants={cardVariants}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
            >
              {/* Card top flare decor */}
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent group-hover:via-brand-primary/40 transition"></div>

              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary group-hover:bg-brand-primary group-hover:text-brand-text-primary transition duration-300">
                <f.icon className="w-5 h-5" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-brand-text-primary group-hover:text-brand-primary transition">
                  {f.title}
                </h3>
                <p className="text-xs text-brand-text-secondary leading-relaxed font-sans">
                  {f.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}
