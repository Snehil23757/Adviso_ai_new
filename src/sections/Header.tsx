import React, { useState, useEffect, useRef } from "react";
import { Menu, X, ArrowRight, Moon, Sun } from "lucide-react";
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
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    let frame = 0;

    const handleScroll = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const delta = currentY - lastScrollYRef.current;

        setIsScrolled(currentY > 20);

        if (!isMenuOpen) {
          if (currentY > 140 && delta > 8) {
            setIsMinimized(true);
          } else if (delta < -8 || currentY < 80) {
            setIsMinimized(false);
          }
        }

        lastScrollYRef.current = currentY;
      });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (isMenuOpen) setIsMinimized(false);
  }, [isMenuOpen]);

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
    <header className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ease-out ${
      isMinimized ? "-translate-y-2 opacity-95" : "translate-y-0 opacity-100"
    } ${
      isScrolled 
        ? "bg-brand-background/90 border-b border-brand-border backdrop-blur-2xl shadow-lg shadow-black/5" 
        : "bg-brand-background/65 border-b border-brand-border/50 backdrop-blur-2xl"
    }`}>
      <div className={`w-full px-6 md:px-12 xl:px-24 flex items-center justify-between max-w-[2000px] mx-auto transition-all duration-500 ease-out ${
        isMinimized ? "h-16 lg:h-[72px]" : "h-24 lg:h-[104px]"
      }`}>
        
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
          <Logo size={isMinimized ? "md" : "lg"} />
        </div>

        {/* Center: Navigation Options */}
        <nav className={`hidden lg:flex items-center transition-all duration-500 ${
          isMinimized ? "gap-7 scale-[0.96] opacity-75" : "gap-9 scale-100 opacity-100"
        }`}>
          {[
            { label: "Platform", id: "platform-overview", path: "/platform" },
            { label: "Features", id: "platform-overview", path: "/features" },
            { label: "Use Cases", id: "use-cases", path: "/use-cases" },
            { label: "Architecture", id: "security", path: "/architecture" },
            { label: "Pricing", id: "pricing", path: "/pricing" },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => scrollToSection(item.id, item.path)}
              className={`${isMinimized ? "text-[14px]" : "text-[15px]"} font-bold text-brand-text-secondary hover:text-brand-text-primary transition cursor-pointer`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right Action buttons */}
        <div className={`hidden lg:flex items-center transition-all duration-500 ${
          isMinimized ? "gap-3 scale-[0.96]" : "gap-5 scale-100"
        }`}>
          {toggleTheme && (
            <button 
              onClick={toggleTheme}
              className={`inline-flex items-center gap-2 rounded-xl bg-brand-surface/80 text-sm font-black text-brand-text-secondary shadow-sm ring-1 ring-brand-border/70 transition hover:bg-brand-surface hover:text-brand-text-primary ${
                isMinimized ? "px-3 py-2.5" : "px-4 py-3"
              }`}
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
              <span>{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
          )}

          {userEmail ? (
            <button
              onClick={onOpenApp}
              className={`bg-brand-text-primary text-brand-background hover:opacity-90 text-sm font-black rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer ${
                isMinimized ? "px-5 py-2.5" : "px-6 py-3"
              }`}
            >
              <span>Open App</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button 
                onClick={onTriggerAuth}
                className="text-sm font-black text-brand-text-secondary hover:text-brand-text-primary transition cursor-pointer px-2"
              >
                Sign In
              </button>
              <button 
                onClick={onTriggerAuth}
                className={`bg-brand-text-primary text-brand-background hover:opacity-90 text-sm font-black rounded-xl transition-all shadow-lg shadow-black/5 flex items-center gap-2 cursor-pointer ${
                  isMinimized ? "px-5 py-2.5" : "px-6 py-3"
                }`}
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
              { label: "Platform", id: "platform-overview", path: "/platform" },
              { label: "Features", id: "platform-overview", path: "/features" },
              { label: "Use Cases", id: "use-cases", path: "/use-cases" },
              { label: "Architecture", id: "security", path: "/architecture" },
              { label: "Pricing", id: "pricing", path: "/pricing" },
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
