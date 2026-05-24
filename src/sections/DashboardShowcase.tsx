import React, { useState } from "react";
import { Sliders, TrendingUp, AlertTriangle, ShieldCheck, HelpCircle } from "lucide-react";
import InteractiveChart from "../components/InteractiveChart.tsx";

export default function DashboardShowcase() {
  const [priceMultiplier, setPriceMultiplier] = useState(1.1);
  const [marketingInvestment, setMarketingInvestment] = useState(1.2);
  const [operatingEfficiency, setOperatingEfficiency] = useState(1.05);

  const handleReset = () => {
    setPriceMultiplier(1.0);
    setMarketingInvestment(1.0);
    setOperatingEfficiency(1.0);
  };

  return (
    <section id="dashboard-showcase" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 subtle-grid opacity-15 pointer-events-none"></div>

      <div className="w-full px-6 md:px-12 xl:px-24 relative z-10 space-y-16 max-w-[2000px] mx-auto">
        
        {/* Header Title */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-brand-primary">
            SCENARIO RUNWAY SIMULATOR
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-brand-text-primary leading-tight">
            Explore Interactive Strategic Projections
          </h2>
          <p className="text-sm text-brand-text-secondary">
            Toggle the operational sliders below to witness how price hikes, marketing investments, and logistical efficiency index adjustments recalculate your revenue curve instantly.
          </p>
        </div>

        {/* Dashboard Grid Frame */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Panel: Sliders & Controls */}
          <div className="lg:col-span-5 bg-brand-surface/40 backdrop-blur-md rounded-2xl border border-brand-border p-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-brand-border pb-3">
                <div className="flex items-center gap-2 text-brand-text-primary">
                  <Sliders className="w-4 h-4 text-brand-primary" />
                  <span className="text-sm font-bold uppercase tracking-wider font-mono">Simulation Parameters</span>
                </div>
                <button
                  onClick={handleReset}
                  className="text-xs font-mono font-bold text-brand-primary hover:underline cursor-pointer"
                >
                  RESET DEFAULTS
                </button>
              </div>

              {/* Slider 1: Pricing Multiplier */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-brand-text-primary">Pricing Optimization Index</span>
                  <span className="font-mono text-brand-primary font-bold bg-brand-primary/10 px-2 py-0.5 rounded border border-brand-primary/20">
                    {priceMultiplier.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.5"
                  step="0.05"
                  value={priceMultiplier}
                  onChange={(e) => setPriceMultiplier(parseFloat(e.target.value))}
                  className="w-full accent-brand-primary h-1 rounded-full bg-brand-text-primary outline-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-brand-text-secondary uppercase">
                  <span>Competitive Discount</span>
                  <span>Premium Value Position</span>
                </div>
              </div>

              {/* Slider 2: Marketing Intensity */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-brand-text-primary">Marketing Acquisition budget</span>
                  <span className="font-mono text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
                    {marketingInvestment.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={marketingInvestment}
                  onChange={(e) => setMarketingInvestment(parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 h-1 rounded-full bg-brand-text-primary outline-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-brand-text-secondary uppercase">
                  <span>Lean Organic</span>
                  <span>Aggressive Push</span>
                </div>
              </div>

              {/* Slider 3: Operating Efficiency */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-brand-text-primary">Operational Efficiency Scale</span>
                  <span className="font-mono text-indigo-400 font-bold bg-indigo-400/10 px-2 py-0.5 rounded border border-indigo-400/20">
                    {operatingEfficiency.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.5"
                  step="0.05"
                  value={operatingEfficiency}
                  onChange={(e) => setOperatingEfficiency(parseFloat(e.target.value))}
                  className="w-full accent-indigo-400 h-1 rounded-full bg-brand-text-primary outline-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-brand-text-secondary uppercase">
                  <span>Auxiliary Overhead</span>
                  <span>Lean Systems</span>
                </div>
              </div>

            </div>

            {/* AI Warning / Context alert box */}
            <div className="mt-6 p-4 rounded-xl border border-brand-primary/10 bg-brand-primary/5 space-y-1.5 self-end w-full">
              <div className="flex items-center gap-1.5 text-xs text-brand-primary font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="uppercase tracking-wider font-mono">ELASTICITY INSIGHT WARNING</span>
              </div>
              <p className="text-[11px] text-brand-text-primary leading-relaxed">
                {priceMultiplier > 1.3 
                  ? "Elevated price indexes over 1.30x trigger customer volume attrition risks unless balanced by at least a 1.20x marketing buffer."
                  : "Model parameters indicate optimal margin stability. Operational metrics are set to maximize quarterly unit return targets."}
              </p>
            </div>

          </div>

          {/* Right Panel: Chart Visualization */}
          <div className="lg:col-span-7 bg-brand-surface/40 backdrop-blur-md rounded-2xl border border-brand-border p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-brand-border pb-3">
                <div>
                  <span className="text-[9px] font-mono text-brand-text-secondary uppercase tracking-wider leading-none">REVENUE SIMULATION COMPARISON</span>
                  <h4 className="text-sm font-bold text-brand-text-primary mt-1">Four-Quarter Cumulative Impact Projection</h4>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-1 border-t-2 border-dashed border-gray-500"></span>
                    <span className="text-slate-400">Baseline</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-1 bg-brand-primary rounded"></span>
                    <span className="text-brand-text-primary font-bold">Simulated</span>
                  </div>
                </div>
              </div>

              {/* The actual Recharts component */}
              <InteractiveChart
                priceMultiplier={priceMultiplier}
                marketingInvestment={marketingInvestment}
                operatingEfficiency={operatingEfficiency}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-brand-border text-center">
              <div>
                <span className="block text-[8px] font-mono text-brand-text-secondary uppercase">REVENUE CHANGE</span>
                <span className="block text-sm font-bold text-brand-primary mt-0.5">
                  +{Math.round((priceMultiplier * 0.6 + Math.sqrt(marketingInvestment) * 0.4 - 1.0) * 100)}%
                </span>
              </div>
              <div>
                <span className="block text-[8px] font-mono text-brand-text-secondary uppercase">MARGIN SECURITY</span>
                <span className="block text-sm font-bold text-emerald-400 mt-0.5">
                  {Math.round(82 * operatingEfficiency)}%
                </span>
              </div>
              <div>
                <span className="block text-[8px] font-mono text-brand-text-secondary uppercase">RECOMMENDED MOVE</span>
                <span className="block text-[10px] font-bold text-brand-text-primary uppercase mt-1 truncate">
                  {priceMultiplier > 1.25 ? "Rebalance Pricing" : "Maintain Scaling"}
                </span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
