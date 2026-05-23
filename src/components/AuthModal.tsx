import React, { useState } from "react";
import { X, Lock, Mail, Building, User, ArrowRight, Shield, Sparkles, Cpu } from "lucide-react";
import BrandLogo from "./BrandLogo.tsx";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
}

type AuthMode = "login" | "signup";

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [org, setOrg] = useState("");
  const [role, setRole] = useState("Startup Founder");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !email.includes("@")) {
      setError("Please provide a valid corporate email address.");
      return;
    }
    if (password.length < 6) {
      setError("Master password must be at least 6 characters.");
      return;
    }
    if (mode === "signup" && !org) {
      setError("Please provide your Organization/Entity Name.");
      return;
    }

    setIsLoading(true);

    // Simulate authenticating safely
    setTimeout(() => {
      setIsLoading(false);
      onSuccess(email);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Dark overlay backdrop */}
      <div 
        className="fixed inset-0 bg-[#050816]/90 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Auth Card Container */}
      <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-brand-surface border border-white/10 p-6 sm:p-8 shadow-2xl transition-all duration-350 dot-grid text-left z-10">
        
        {/* Flare decor and Close */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-brand-primary/80 to-transparent"></div>
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-brand-text-secondary hover:text-white transition duration-200 p-1.5 bg-white/5 hover:bg-white/10 rounded-lg"
          aria-label="Close authentication panel"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand symbol */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-xl overflow-hidden border border-brand-primary/30 bg-black shadow-lg shadow-brand-primary/10">
            <BrandLogo mark />
          </div>
          <span className="text-sm font-mono tracking-widest font-extrabold text-white uppercase">
            ADVISO SECURE GATEWAY
          </span>
        </div>

        {/* Modal Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-black text-white font-sans tracking-tight">
            {mode === "login" ? "Verify Credentials" : "Initialize Advisor Account"}
          </h2>
          <p className="text-xs text-brand-text-secondary mt-1">
            {mode === "login" 
              ? "Access dynamic what-if simulation nodes and core Gemini strategic workflows." 
              : "Register corporate data parameters to explore automated decision ledgers."}
          </p>
        </div>

        {/* Tabs for Login vs Signup Toggle */}
        <div className="grid grid-cols-2 gap-1 bg-black/40 p-1 rounded-xl border border-white/5 mb-6">
          <button
            type="button"
            onClick={() => { setMode("login"); setError(""); }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              mode === "login" 
                ? "bg-brand-primary text-white shadow-md shadow-brand-primary/10" 
                : "text-brand-text-secondary hover:text-white"
            }`}
          >
            Sign In Portal
          </button>
          <button
            type="button"
            onClick={() => { setMode("signup"); setError(""); }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              mode === "signup" 
                ? "bg-brand-primary text-white shadow-md shadow-brand-primary/10" 
                : "text-brand-text-secondary hover:text-white"
            }`}
          >
            Register Profile
          </button>
        </div>

        {/* Error notification banner */}
        {error && (
          <div className="p-3 mb-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0"></span>
            <span>{error}</span>
          </div>
        )}

        {/* Form elements */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {mode === "signup" && (
            <>
              {/* Organization/Entity Name input */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono tracking-wider text-brand-text-secondary uppercase">
                  Corporate Organization / Entity
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-text-secondary">
                    <Building className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Acme Analytics Inc."
                    value={org}
                    onChange={(e) => setOrg(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-white/30 focus:border-brand-primary focus:bg-black/60 outline-none transition"
                  />
                </div>
              </div>

              {/* Security Analyst Role select dropdown */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono tracking-wider text-brand-text-secondary uppercase">
                  Advisory Target Profile Role
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-text-secondary">
                    <User className="w-4 h-4" />
                  </div>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-white/30 focus:border-brand-primary focus:bg-black/60 outline-none transition appearance-none cursor-pointer"
                  >
                    <option value="Startup Founder" className="bg-brand-surface text-white">Startup Founder</option>
                    <option value="MSME Merchant" className="bg-brand-surface text-white">MSME / Local Merchant</option>
                    <option value="Strategic Business Analyst" className="bg-brand-surface text-white">Business Analyst</option>
                    <option value="Venture Capital Partner" className="bg-brand-surface text-white">Venture Capital Partner</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Email Inputs */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-mono tracking-wider text-brand-text-secondary uppercase">
              Corporate Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-text-secondary">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                placeholder="analyst@organization.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-white/30 focus:border-brand-primary focus:bg-black/60 outline-none transition"
              />
            </div>
          </div>

          {/* Password Inputs */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-mono tracking-wider text-brand-text-secondary uppercase">
              Secure Master Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-text-secondary">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-white/30 focus:border-brand-primary focus:bg-black/60 outline-none transition"
              />
            </div>
          </div>

          {/* Bottom helper */}
          {mode === "login" && (
            <div className="flex justify-end pt-1">
              <button 
                type="button" 
                onClick={() => setError("Demo system defaults: simply enter any valid email & 6-digit password to authenticate.")} 
                className="text-[10px] font-mono text-brand-primary hover:underline"
              >
                FORGOT ACCESS DECODE?
              </button>
            </div>
          )}

          {/* Action Trigger Submit */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-primary hover:bg-brand-primary/95 text-xs font-bold text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition duration-200 cursor-pointer disabled:opacity-60 shadow-lg shadow-brand-primary/10"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>compiling tokens...</span>
                </>
              ) : (
                <>
                  <span>{mode === "login" ? "Verify Security Token" : "Generate Secure Workspace"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

        </form>

        {/* Trust disclaimer */}
        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-brand-text-secondary">
          <div className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-brand-primary" />
            <span>256-BIT CRYPTOGRAPHY ACTIVE</span>
          </div>
          <span>v2.0-SECURE</span>
        </div>

      </div>
    </div>
  );
}
