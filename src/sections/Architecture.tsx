import React, { useState } from "react";
import { Server, Database, ShieldAlert, Cpu, Layers, HardDrive, Network } from "lucide-react";

type ArchNodeKey = "AI Engine" | "App Service" | "Registry Cache" | "Gateway Security";

export default function Architecture() {
  const [activeNode, setActiveNode] = useState<ArchNodeKey>("AI Engine");

  const archNodes = {
    "AI Engine": {
      icon: Cpu,
      title: "FastAPI Analytical engine",
      tech: "Python, FastAPI, Gemini LLM SDK, LangChain ready",
      desc: "An independent decision-intelligence layer processing high-dimensional enterprise operational metrics, executing context-aware semantic retrieval, and outputting formatted strategy report payloads.",
      capabilities: [
        "Advanced LLM orchestration",
        "Deterministic JSON schema validation",
        "No caching of raw client keys",
        "Sub-second execution response latency"
      ]
    },
    "App Service": {
      icon: Server,
      title: "Node.js app Routing Network",
      tech: "TypeScript, Express, ESModule standalone deployment",
      desc: "Serves as the central transaction broker, managing secure connections between client interfaces, operational databases, background job runners, and internal API channels.",
      capabilities: [
        "Strict Type-Safe payload handling",
        "Role-Based resource routing constraints",
        "Unified analytical database adapters",
        "Horizontal autoscaling capabilities"
      ]
    },
    "Registry Cache": {
      icon: Database,
      title: "Relational Ledger & Redis Cache",
      tech: "PostgreSQL database core, Redis key-value memory layer",
      desc: "Provides long-term query storage for corporate records of recommendations with millisecond-speed caching for active simulation parameters.",
      capabilities: [
        "Encrypted database storage matrices",
        "Fast operational index retrieval states",
        "Deterministic transaction logs",
        "Automated backup pipelines"
      ]
    },
    "Gateway Security": {
      icon: ShieldAlert,
      title: "Secure Enterprise Gateway",
      tech: "JWT Auth, SSL/TLS, CORS isolation, API Throttling",
      desc: "Strictly guards database integrations from unauthorized ingress, sanitizing parameters and encrypting client tokens to prevent analytical breaches.",
      capabilities: [
        "Token-Based credential isolation",
        "Standard security sanitization headers",
        "Automated malicious ingress blockages",
        "Comprehensive operational audit trials"
      ]
    }
  };

  const currentNode = archNodes[activeNode];

  return (
    <section id="architecture" className="relative py-24 bg-black/10 overflow-hidden">
      <div className="absolute inset-0 subtle-grid opacity-10 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10 w-full space-y-12">
        
        {/* Title */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#4A63FF]">
            SYSTEM INTEGRATIONS
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Enterprise Grade Full-Stack Security Architecture
          </h2>
          <p className="text-sm text-brand-text-secondary">
            Adviso AI utilizes a decoupled, resilient architecture engineered to maintain high availability, absolute data containment, and zero telemetry overhead.
          </p>
        </div>

        {/* Interactive Diagram UI */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-brand-surface/30 p-6 lg:p-10 rounded-2xl border border-white/5">
          
          {/* Diagrams Core Blocks */}
          <div className="lg:col-span-6 space-y-4">
            <span className="block text-[10px] font-mono text-brand-text-secondary uppercase tracking-widest text-center">
              INTERACTIVE PIPELINE BLOCKS (Click to inspect)
            </span>

            <div className="flex flex-col gap-3 relative">
              {(Object.keys(archNodes) as ArchNodeKey[]).map((key) => {
                const node = archNodes[key];
                const isActive = activeNode === key;
                return (
                  <div
                    key={key}
                    onClick={() => setActiveNode(key)}
                    className={`flex items-center justify-between p-4 rounded-xl border transition cursor-pointer select-none ${
                      isActive 
                        ? "bg-brand-primary/10 border-brand-primary text-white shadow-lg shadow-brand-primary/5" 
                        : "bg-black/30 border-white/5 text-brand-text-secondary hover:border-white/10 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? "bg-brand-primary text-white" : "bg-white/5 text-brand-text-secondary"}`}>
                        <node.icon className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="block text-xs font-bold leading-none">{node.title}</span>
                        <span className="text-[9px] font-mono opacity-60 uppercase tracking-wider">{key}</span>
                      </div>
                    </div>
                    <Network className={`w-4 h-4 transition ${isActive ? "text-brand-primary opacity-100 rotate-45" : "text-brand-text-secondary/40"}`} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Node Information */}
          <div className="lg:col-span-6 bg-black/40 rounded-xl border border-white/5 p-6 text-left space-y-4 h-full flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-mono text-[#0EA5E9] font-bold bg-[#0EA5E9]/10 px-2 py-0.5 rounded border border-[#0EA5E9]/20 uppercase">
                  {currentNode.tech}
                </span>
                <h3 className="text-xl font-bold text-white mt-3 font-sans">
                  {currentNode.title}
                </h3>
              </div>
              
              <p className="text-xs text-brand-text-secondary leading-relaxed leading-normal">
                {currentNode.desc}
              </p>

              <div className="border-t border-white/5 pt-4 space-y-2">
                <span className="block text-[9px] font-mono text-brand-text-secondary uppercase tracking-widest">
                  CORE OPERATION CAPABILITIES
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentNode.capabilities.map((cap, cIdx) => (
                    <div key={cIdx} className="flex items-center gap-2 text-[11px] text-white/90">
                      <div className="w-1 h-1 rounded-full bg-brand-primary shrink-0"></div>
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 text-[10px] font-mono text-brand-text-secondary flex justify-between">
              <span>STATUS: LIVE_COMMUNICATION_ONLINE</span>
              <span>INDEX: 0XAA{activeNode.length}</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
