import React from "react";
import { Instagram, Linkedin, Mail, Twitter } from "lucide-react";
import Logo from "../components/Logo.tsx";

interface FooterProps {
  onNavigatePublic?: (path: string) => void;
}

interface FooterLink {
  label: string;
  id: string;
  path?: string;
}

const FOOTER_COLUMNS: Array<{ title: string; links: FooterLink[] }> = [
  {
    title: "Platform",
    links: [
      { label: "Core Overview", id: "platform-overview", path: "/platform" },
      { label: "Capability Features", id: "platform-overview", path: "/features" },
      { label: "Scenario Simulator", id: "use-cases", path: "/use-cases" },
      { label: "Architecture Map", id: "security", path: "/architecture" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "MSME Local Optimization", id: "use-cases", path: "/use-cases" },
      { label: "SaaS Startups Runway", id: "use-cases", path: "/use-cases" },
      { label: "Founder Decision Support", id: "use-cases", path: "/use-cases" },
      { label: "Analyst Automated Reporting", id: "use-cases", path: "/use-cases" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Adviso AI", id: "about", path: "/about" },
      { label: "Vision & Mission", id: "vision", path: "/vision" },
      { label: "Team", id: "about", path: "/about" },
      { label: "Contact Us", id: "contact", path: "/contact" },
    ],
  },
];

const SOCIAL_LINKS = [
  {
    label: "X",
    href: "https://x.com/advisoai",
    icon: Twitter,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/adviso-ai",
    icon: Linkedin,
  },
  {
    label: "Instagram",
    href: "https://instagram.com/advisoai",
    icon: Instagram,
  },
  {
    label: "Email",
    href: "mailto:contact@adviso.ai",
    icon: Mail,
  },
];

const LEGAL_LINKS: FooterLink[] = [
  { label: "Privacy Policy", id: "contact", path: "/contact" },
  { label: "Terms of Service", id: "contact", path: "/contact" },
  { label: "Security", id: "security", path: "/architecture" },
  { label: "Contact", id: "contact", path: "/contact" },
];

export default function Footer({ onNavigatePublic }: FooterProps) {
  const currentYear = new Date().getFullYear();

  const navigateTo = (link: FooterLink) => {
    if (link.path && onNavigatePublic) {
      onNavigatePublic(link.path);
      return;
    }

    const element = document.getElementById(link.id);
    if (element) {
      const offset = 80;
      const pos = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: pos - offset, behavior: "smooth" });
    }
  };

  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-[#07111f] text-slate-200">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(20,93,255,0.18),transparent_34%),radial-gradient(circle_at_82%_8%,rgba(32,215,255,0.1),transparent_30%),linear-gradient(180deg,#081525_0%,#07111f_55%,#060d18_100%)]" />
      <div className="absolute inset-0 subtle-grid opacity-[0.08] pointer-events-none" />

      <div className="relative z-10 mx-auto w-full max-w-[1800px] px-6 py-16 md:px-12 lg:px-20 xl:px-28">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.35fr_2.5fr] lg:gap-20">
          <div className="max-w-md">
            <Logo size="xl" className="text-white" />

            <p className="mt-8 max-w-sm text-lg leading-8 text-slate-300/90">
              AI-powered business intelligence platform helping organizations transform data into actionable decisions.
            </p>

            <a
              href="mailto:contact@adviso.ai"
              className="mt-7 inline-flex items-center gap-4 text-slate-300 transition hover:text-white"
              aria-label="Email Adviso AI"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] shadow-lg shadow-black/10">
                <Mail className="h-5 w-5" />
              </span>
              <span className="text-base font-medium">contact@adviso.ai</span>
            </a>

            <div className="mt-9">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-500">Follow Us</p>
              <div className="mt-5 flex flex-wrap gap-5">
                {SOCIAL_LINKS.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      target={social.href.startsWith("mailto:") ? undefined : "_blank"}
                      rel={social.href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
                      className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-400 shadow-lg shadow-black/10 transition hover:-translate-y-1 hover:border-brand-primary/40 hover:bg-brand-primary/10 hover:text-white"
                      aria-label={social.label}
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
            {FOOTER_COLUMNS.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <h3 className="text-base font-black uppercase tracking-[0.18em] text-brand-primary drop-shadow-[0_0_16px_rgba(20,93,255,0.45)]">
                  {column.title}
                </h3>
                <div className="mt-5 h-px w-12 bg-brand-primary" />
                <ul className="mt-7 space-y-6">
                  {column.links.map((link) => (
                    <li key={`${column.title}-${link.label}`}>
                      <button
                        type="button"
                        onClick={() => navigateTo(link)}
                        className="text-left text-lg font-medium text-slate-400 transition hover:text-white"
                      >
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-16 border-t border-white/10 pt-10">
          <div className="flex flex-col gap-7 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
            <p>Copyright {currentYear} Adviso AI Inc. All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
              {LEGAL_LINKS.map((link, index) => (
                <React.Fragment key={link.label}>
                  <button
                    type="button"
                    onClick={() => navigateTo(link)}
                    className="font-medium transition hover:text-white"
                  >
                    {link.label}
                  </button>
                  {index < LEGAL_LINKS.length - 1 && <span className="text-brand-primary">•</span>}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
