import React, { useState, useEffect } from "react";
import { Sparkles, Menu, X, ArrowRight, ShieldCheck, Cpu, Moon, Sun } from "lucide-react";
import Logo from "../components/Logo.tsx";

interface HeaderProps {
  userEmail: string | null;
  onLogout: () => void;
  onTriggerAuth: () => void;
  onOpenApp?: () => void;
  onNavigatePublic?: (path: string) => void;
  theme?: "light" | "dark";
  toggleTheme?: () => void;
}

export default function Header({ userEmail, onLogout, onTriggerAuth, onOpenApp, onNavigatePublic, theme, toggleTheme }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string, path?: string) => {
    setIsMenuOpen(false);
    if (path && onNavigatePublic) {
      onNavigatePublic(path);
      return;
    }
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
        ? "bg-brand-background/80 border-b border-brand-border backdrop-blur-xl shadow-sm" 
        : "bg-transparent border-b border-transparent"
    }`}>
      <div className="w-full px-6 md:px-12 xl:px-24 h-24 flex items-center justify-between max-w-[2000px] mx-auto">
        
        {/* Left: Adviso AI Logo with SVG Graphic */}
        <div 
          onClick={() => {
            if (onNavigatePublic) {
              onNavigatePublic("/");
              return;
            }
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="cursor-pointer group flex items-center h-12"
        >
          <Logo size="md" />
        </div>

        {/* Center: Navigation Options */}
        <nav className="hidden lg:flex items-center gap-7">
          {[
            { label: "Features", id: "core-features", path: "/features" },
            { label: "Pricing", id: "pricing", path: "/pricing" },
            { label: "Docs", id: "architecture", path: "/about" },
            { label: "Contact", id: "contact", path: "/contact" },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => scrollToSection(item.id, item.path)}
              className="text-sm font-medium text-brand-text-secondary hover:text-brand-text-primary transition cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right Action buttons */}
        <div className="hidden lg:flex items-center gap-5">
          {toggleTheme && (
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-brand-surface border border-transparent hover:border-brand-border transition-colors text-brand-text-secondary hover:text-brand-text-primary"
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}

          {userEmail ? (
            <button
              onClick={onOpenApp}
              className="bg-brand-text-primary text-brand-background hover:opacity-90 text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span>Open App</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button 
                onClick={onTriggerAuth}
                className="text-sm font-semibold text-brand-text-secondary hover:text-brand-text-primary transition cursor-pointer px-2"
              >
                Sign In
              </button>
              <button 
                onClick={onTriggerAuth}
                className="bg-brand-text-primary text-brand-background hover:opacity-90 text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Mobile menu toggle */}
        <div className="lg:hidden flex items-center gap-2">
          {toggleTheme && (
            <button 
              onClick={toggleTheme}
              className="p-2 text-brand-text-secondary hover:text-brand-text-primary"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          )}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-brand-text-secondary hover:text-brand-text-primary transition p-2"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMenuOpen && (
        <div className="lg:hidden bg-brand-background border-b border-brand-border px-6 py-6 space-y-4 animate-fade-in shadow-xl">
          <div className="flex flex-col gap-4">
            {[
              { label: "Features", id: "core-features", path: "/features" },
              { label: "Pricing", id: "pricing", path: "/pricing" },
              { label: "Docs", id: "architecture", path: "/about" },
              { label: "Contact", id: "contact", path: "/contact" },
            ].map((item, idx) => (
              <button
                key={idx}
                onClick={() => scrollToSection(item.id, item.path)}
                className="text-left py-2 text-base font-medium text-brand-text-secondary hover:text-brand-text-primary transition"
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="pt-6 border-t border-brand-border flex flex-col gap-3">
            {userEmail ? (
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    onOpenApp?.();
                    setIsMenuOpen(false);
                  }}
                  className="w-full bg-brand-text-primary text-brand-background hover:opacity-90 text-sm font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Open App</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <button 
                  onClick={() => {
                    onTriggerAuth();
                    setIsMenuOpen(false);
                  }}
                  className="text-center py-3 text-sm font-semibold text-brand-text-secondary hover:text-brand-text-primary transition cursor-pointer border border-brand-border rounded-xl"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => {
                    onTriggerAuth();
                    setIsMenuOpen(false);
                  }}
                  className="w-full bg-brand-text-primary text-brand-background hover:opacity-90 text-sm font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Get Started</span>
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
