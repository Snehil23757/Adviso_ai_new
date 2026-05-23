import React, { useState, useEffect } from "react";
import { Sparkles, Menu, X, ArrowRight, ShieldCheck, Cpu, Sun, Moon } from "lucide-react";
import BrandLogo from "../components/BrandLogo.tsx";

interface HeaderProps {
  userEmail: string | null;
  onLogout: () => void;
  onTriggerAuth: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

export default function Header({ userEmail, onLogout, onTriggerAuth, theme, onToggleTheme }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setIsMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // height of header
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: elementPosition - offset,
        behavior: "smooth"
      });
    }
  };

  return (
    <header className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
      isScrolled 
        ? "bg-brand-background/90 border-b border-white/5 backdrop-blur-md" 
        : "bg-transparent border-b border-transparent"
    }`}>
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        
        {/* Left: Adviso AI Logo */}
        <div 
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center cursor-pointer group"
        >
          <div className="h-12 w-[210px] sm:w-[270px] overflow-hidden rounded-xl border border-white/10 bg-black/60 shadow-lg shadow-brand-primary/10 transition duration-300 group-hover:border-brand-primary/40">
            <BrandLogo />
          </div>
        </div>

        {/* Center: Navigation Options */}
        <nav className="hidden lg:flex items-center gap-7">
          {[
            { label: "Platform", id: "platform-overview" },
            { label: "Features", id: "core-features" },
            { label: "Use Cases", id: "use-cases" },
            { label: "Workflow", id: "workflow" },
            { label: "Architecture", id: "architecture" },
            { label: "Security", id: "security" },
            { label: "Pricing", id: "pricing" },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => scrollToSection(item.id)}
              className="text-sm font-medium text-brand-text-secondary hover:text-white transition cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right Action buttons */}
        <div className="hidden lg:flex items-center gap-4">
          <button
            type="button"
            onClick={onToggleTheme}
            className="text-xs font-semibold text-brand-text-secondary hover:text-white transition bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg border border-white/10 cursor-pointer flex items-center gap-2"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
          {userEmail ? (
            <div className="flex items-center gap-3">
              <div className="bg-brand-primary/15 border border-brand-primary/30 rounded-xl px-3 py-1.5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                <span className="text-xs font-mono text-white/95 max-w-[140px] truncate">
                  {userEmail}
                </span>
              </div>
              <button 
                onClick={onLogout}
                className="text-xs font-mono font-bold text-[#A0AEC0] hover:text-white transition bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 cursor-pointer"
              >
                LOGOUT
              </button>
            </div>
          ) : (
            <>
              <button 
                onClick={onTriggerAuth}
                className="text-sm font-semibold text-brand-text-secondary hover:text-white transition cursor-pointer"
              >
                Access Console / Sign In
              </button>
              <button 
                onClick={onTriggerAuth}
                className="bg-brand-primary hover:bg-brand-primary/95 text-xs font-bold text-white px-5 py-2.5 rounded-lg border border-brand-primary/20 transition-all hover:shadow-md hover:shadow-brand-primary/20 flex items-center gap-1.5 cursor-pointer"
              >
                <span>Initialize Free</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <div className="lg:hidden">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-brand-text-secondary hover:text-white transition p-2"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMenuOpen && (
        <div className="lg:hidden bg-brand-background border-b border-white/5 px-6 py-6 space-y-4 animate-fade-in">
          <div className="flex flex-col gap-4">
            {[
              { label: "Platform Overview", id: "platform-overview" },
              { label: "Core Features", id: "core-features" },
              { label: "Use Cases", id: "use-cases" },
              { label: "Workflow Analysis", id: "workflow" },
              { label: "Architecture", id: "architecture" },
              { label: "Security", id: "security" },
              { label: "Pricing Comparison", id: "pricing" },
            ].map((item, idx) => (
              <button
                key={idx}
                onClick={() => scrollToSection(item.id)}
                className="text-left py-2 text-base font-medium text-brand-text-secondary hover:text-white transition"
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
            <button
              type="button"
              onClick={onToggleTheme}
              className="w-full text-center py-2.5 text-xs font-mono font-bold text-brand-text-secondary bg-white/5 border border-white/10 rounded-lg cursor-pointer flex items-center justify-center gap-2"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span>{theme === "dark" ? "LIGHT THEME" : "DARK THEME"}</span>
            </button>
            {userEmail ? (
              <div className="space-y-2">
                <div className="bg-brand-primary/10 border border-brand-primary/30 rounded-xl px-3 py-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                  <span className="text-xs font-mono text-white max-w-[170px] truncate">{userEmail}</span>
                </div>
                <button 
                  onClick={() => {
                    onLogout();
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-center py-2.5 text-xs font-mono font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg cursor-pointer"
                >
                  LOGOUT SECURITY PROFILE
                </button>
              </div>
            ) : (
              <>
                <button 
                  onClick={() => {
                    onTriggerAuth();
                    setIsMenuOpen(false);
                  }}
                  className="text-center py-2.5 text-sm font-semibold text-brand-text-secondary hover:text-white transition cursor-pointer"
                >
                  Access Console
                </button>
                <button 
                  onClick={() => {
                    onTriggerAuth();
                    setIsMenuOpen(false);
                  }}
                  className="w-full bg-brand-primary hover:bg-brand-primary/90 text-sm font-bold text-white py-3 rounded-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Register Strategy</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
