import React, { useState } from "react";
import { Server, Database, ShieldAlert, Cpu, Network, FileSpreadsheet } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type ArchNodeKey = "Intelligence Core" | "Format Engine" | "Data Vault" | "Enterprise Gateway";

export default function Architecture() {
  const [activeNode, setActiveNode] = useState<ArchNodeKey>("Intelligence Core");

  const archNodes = {
    "Intelligence Core": {
      icon: Cpu,
      title: "Advanced Data Intelligence",
      tech: "High-Dimensional Analytical Processing",
      desc: "An independent decision-intelligence layer processing large-scale enterprise operational metrics, executing context-aware retrieval, and outputting formatted strategy report payloads.",
      capabilities: [
        "Massive dataset analysis",
        "Deterministic schema validation",
        "Explainable AI reasoning",
        "Real-time actionable insights"
      ]
    },
    "Format Engine": {
      icon: FileSpreadsheet,
      title: "Omni-Format Processing Engine",
      tech: "CSV, Excel, JSON & API Integration",
      desc: "Serves as the central transaction broker, managing the rapid ingestion and normalization of multiple file formats effortlessly so you don't worry about data wrangling.",
      capabilities: [
        "Rapid multi-format ingestion",
        "Automated data cleaning & structuring",
        "Continuous API data syncing",
        "Role-Based resource constraints"
      ]
    },
    "Data Vault": {
      icon: Database,
      title: "Scalable Ledger & Data Vault",
      tech: "Encrypted Long-Term Storage",
      desc: "Provides long-term, scalable storage for corporate records of recommendations with lightning-speed retrieval for active operational parameters.",
      capabilities: [
        "Encrypted analytical storage",
        "Lightning-fast metric retrieval",
        "Deterministic transaction logs",
        "Automated backup pipelines"
      ]
    },
    "Enterprise Gateway": {
      icon: ShieldAlert,
      title: "Secure Enterprise Gateway",
      tech: "Zero-Trust Security & Compliance",
      desc: "Strictly guards your analytics from unauthorized ingress, sanitizing parameters and encrypting client tokens to prevent security breaches.",
      capabilities: [
        "Zero-Trust token credential isolation",
        "Standard security sanitization",
        "Automated malicious ingress blockages",
        "Comprehensive operational audit trails"
      ]
    }
  };

  const currentNode = archNodes[activeNode];

  return (
    <section id="architecture" className="relative py-32 bg-brand-surface-secondary overflow-hidden">
      <div className="absolute inset-0 subtle-grid opacity-10 pointer-events-none"></div>

      <div className="w-full px-6 md:px-12 xl:px-24 relative z-10 space-y-16">
        
        {/* Title */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-blue-500">
            ENTERPRISE INFRASTRUCTURE
          </span>
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-brand-text-primary leading-tight">
            Built For Enterprise Scale
          </h2>
          <p className="text-base sm:text-lg text-brand-text-secondary leading-relaxed font-sans">
            Adviso AI utilizes a decoupled, resilient architecture engineered to maintain high availability, absolute data containment, and rapid processing of massive datasets.
          </p>
        </div>

        {/* Interactive Diagram UI */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch bg-brand-surface/30 p-6 lg:p-10 rounded-3xl border border-brand-border max-w-[1800px] mx-auto">
          
          {/* Diagrams Core Blocks */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6">
            <span className="block text-[10px] font-mono text-brand-text-secondary uppercase tracking-widest text-center">
              INTERACTIVE PIPELINE BLOCKS (Click to inspect)
            </span>

            <div className="flex flex-col gap-4 relative">
              {(Object.keys(archNodes) as ArchNodeKey[]).map((key) => {
                const node = archNodes[key];
                const isActive = activeNode === key;
                return (
                  <motion.div
                    key={key}
                    onClick={() => setActiveNode(key)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center justify-between p-5 rounded-2xl border transition-all cursor-pointer select-none ${
                      isActive 
                        ? "bg-gradient-to-r from-brand-primary/10 to-brand-primary/5 border-brand-primary/30 text-brand-text-primary shadow-lg shadow-brand-primary/5" 
                        : "bg-brand-surface-secondary border-brand-border text-brand-text-secondary hover:border-brand-border hover:text-brand-text-primary"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isActive ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20" : "bg-brand-text-primary/10 text-brand-text-secondary"}`}>
                        <node.icon className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <span className="block text-sm font-bold leading-none">{node.title}</span>
                      </div>
                    </div>
                    <Network className={`w-5 h-5 transition-transform duration-300 ${isActive ? "text-brand-primary opacity-100 rotate-45 scale-110" : "text-brand-text-secondary/30"}`} />
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Detailed Node Information Information */}
          <div className="lg:col-span-7 xl:col-span-8 bg-brand-surface-secondary rounded-3xl border border-brand-border p-8 sm:p-12 text-left flex flex-col justify-between relative overflow-hidden min-h-[400px]">
            {/* Ambient indicator glow */}
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand-primary/10 rounded-full blur-[100px] pointer-events-none"></div>

            <AnimatePresence mode="wait">
              <motion.div 
                key={activeNode}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6 relative z-10"
              >
                <div>
                  <span className="text-xs font-mono text-brand-primary font-bold bg-brand-primary/10 px-3 py-1.5 rounded-full border border-brand-primary/20 uppercase">
                    {currentNode.tech}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-brand-text-primary mt-4 font-sans tracking-tight">
                    {currentNode.title}
                  </h3>
                </div>
                
                <p className="text-base sm:text-lg text-brand-text-secondary leading-relaxed font-sans max-w-2xl">
                  {currentNode.desc}
                </p>

                <div className="border-t border-brand-border pt-6 space-y-4">
                  <span className="block text-[10px] font-mono text-brand-text-secondary uppercase tracking-widest leading-none">
                    CORE OPERATION CAPABILITIES
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {currentNode.capabilities.map((cap, cIdx) => (
                      <div key={cIdx} className="flex items-center gap-3 text-sm text-brand-text-primary font-medium font-sans bg-brand-surface p-3 rounded-xl border border-brand-border shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-brand-primary shrink-0 opacity-80"></div>
                        <span>{cap}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 pt-6 border-t border-brand-border text-xs font-mono text-brand-text-secondary flex flex-wrap gap-4 justify-between tracking-wider relative z-10">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse"></span>
                STATUS: SECURE_LINK_ONLINE
              </span>
              <span>NODE_ID: 0xAA{activeNode.length}F</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
