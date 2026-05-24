import React from "react";
import { Cpu, Linkedin, Mail, ShieldCheck } from "lucide-react";
import Logo from "../components/Logo.tsx";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const columns = [
    {
      title: "Platform",
      links: [
        { label: "Core Overview", id: "platform-overview" },
        { label: "Capability Features", id: "core-features" },
        { label: "Scenario Simulator", id: "dashboard-showcase" },
        { label: "Architecture Map", id: "architecture" },
      ]
    },
    {
      title: "Solutions",
      links: [
        { label: "MSME Local Optimization", id: "use-cases" },
        { label: "SaaS Startups Runway", id: "use-cases" },
        { label: "Founder Decision Support", id: "use-cases" },
        { label: "Analyst Automated Reporting", id: "use-cases" },
      ]
    },
    {
      title: "Company",
      links: [
        { label: "About Capital Partners", id: "trust-metrics" },
        { label: "Client Security Audits", id: "security" },
        { label: "Enterprise Engineering Blog", id: "architecture" },
        { label: "Technology Alliance Hub", id: "workflow" },
      ]
    },
    {
      title: "Legal & Audits",
      links: [
        { label: "Enterprise Security Policy", id: "security" },
        { label: "User Data Containment rules", id: "security" },
        { label: "Strategic Report Terms", id: "pricing" },
        { label: "Compliance Directives", id: "security" },
      ]
    }
  ];

  const scrollToAnchor = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const pos = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: pos - offset, behavior: "smooth" });
    }
  };

  return (
    <footer className="relative bg-brand-background border-t border-brand-border py-16 overflow-hidden">
      <div className="absolute inset-0 subtle-grid opacity-10 pointer-events-none"></div>

      <div className="w-full px-6 md:px-12 xl:px-24 mx-auto relative z-10 space-y-16 max-w-[2000px]">
        
        {/* Top Sitemap Rows Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          
          {/* Identity col */}
          <div className="col-span-2 space-y-4 text-left">
            <div className="h-12 flex items-center">
              <Logo size="md" />
            </div>
            
            <p className="text-xs text-brand-text-secondary leading-relaxed max-w-sm">
              Adviso AI is an explainable AI-powered business decision intelligence and strategic recommendation platform helping modern organizations transform fragmented operational data into verified corporate decisions.
            </p>

            <div className="flex items-center gap-3 text-brand-text-secondary">
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-brand-text-primary transition p-1 bg-brand-text-primary rounded hover:bg-brand-text-primary" aria-label="LinkedIn">
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="mailto:contact@advisoadvisor.ai" className="hover:text-brand-text-primary transition p-1 bg-brand-text-primary rounded hover:bg-brand-text-primary" aria-label="Email">
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Sitemaps */}
          {columns.map((col, idx) => (
            <div key={idx} className="space-y-4 text-left">
              <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-brand-text-primary">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link, lIdx) => (
                  <li key={lIdx}>
                    <button
                      onClick={() => scrollToAnchor(link.id)}
                      className="text-xs text-brand-text-secondary hover:text-brand-text-primary transition cursor-pointer text-left leading-none"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}

        </div>

        {/* Bottom copyright declaration */}
        <div className="pt-8 border-t border-brand-border flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-mono text-brand-text-secondary">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-primary" />
            <span>ADVISO ENTERPRISE DEPLOYMENT SECURED ACTIVE</span>
          </div>
          <div className="text-right">
            <span>Copyright {currentYear} Adviso AI Inc. All tactical rights reserved worldwide.</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
