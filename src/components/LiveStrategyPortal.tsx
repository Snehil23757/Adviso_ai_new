import React, { useState } from "react";
import {
  Database,
  Sparkles,
  LineChart,
  CheckCircle2,
  Target,
  TrendingUp,
  Gauge,
  Zap,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Sliders,
  Maximize2,
  FileSpreadsheet,
  Layers,
} from "lucide-react";
import { StrategicReport } from "../types.js";
import { apiUrl } from "../config";

type BusinessType = "MSME" | "Startup" | "Founder" | "Analyst";

export default function LiveStrategyPortal() {
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("Startup");
  const [industry, setIndustry] = useState("Finance & Fintech");
  const [revenueDesc, setRevenueDesc] = useState("$25,000 monthly recurring revenue");
  const [burnRateDesc, setBurnRateDesc] = useState("$12,000 monthly burn rate");
  const [strategicGoals, setStrategicGoals] = useState("Optimize client acquisition and extend runway");
  const [obstaclesDesc, setObstaclesDesc] = useState("Long sales turnaround times for target contracts");

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [report, setReport] = useState<StrategicReport | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Keep track of checklisted items in recommendations
  const [checkedActions, setCheckedActions] = useState<Record<string, boolean>>({});

  const toggleAction = (key: string) => {
    setCheckedActions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    setReport(null);

    // Simulate progressive analytical loading steps to reassure enterprise users
    const steps = [
      "Securing data transmission tunnel",
      "Injecting operational indicators to model layers",
      "Analyzing market-specific industry conditions",
      "Synthesizing high-leverage strategic playbooks",
      "Simulating potential what-if outcome paths",
      "Assembling final strategic scoreboards"
    ];

    let currentStep = 0;
    setLoadingStep(steps[currentStep]);

    const stepInterval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setLoadingStep(steps[currentStep]);
      }
    }, 700);

    try {
      const response = await fetch(apiUrl("/api/analyze"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessName,
          businessType,
          industry,
          revenueDesc,
          burnRateDesc,
          strategicGoals,
          obstaclesDesc,
        }),
      });

      clearInterval(stepInterval);

      if (!response.ok) {
        throw new Error("Strategic analysis engine reported an operational bottleneck.");
      }

      const result = await response.json();
      if (result.success && result.report) {
        setReport(result.report);
      } else {
        throw new Error("Received an incomplete payload from our recommendation systems.");
      }
    } catch (err: any) {
      clearInterval(stepInterval);
      console.error(err);
      setErrorMsg(err.message || "An unexpected error impeded intelligence assembly.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="strategy-portal" className="w-full rounded-2xl border border-brand-border bg-brand-surface/40 backdrop-blur-md p-6 lg:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-medium font-mono uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Live Decision Engine
          </div>
          <h3 className="text-2xl font-bold tracking-tight text-brand-text-primary">
            Operational Strategy & Simulation Center
          </h3>
          <p className="text-sm text-brand-text-secondary mt-1">
            Input business parameters to generate secure, explainable decision reports powered by dynamic context-aware algorithms.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-brand-text-secondary">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>SYSTEM CHIP ACTIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Parameters Input Form */}
        <form onSubmit={handleAnalyze} className="lg:col-span-5 space-y-5">
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text-secondary">
              Business / Initiative Name
            </label>
            <input
              type="text"
              placeholder="e.g. Apex HealthTech"
              className="w-full rounded-lg border border-brand-border bg-brand-surface-secondary px-3 py-2.5 text-sm font-medium text-brand-text-primary placeholder-brand-text-secondary/50 outline-none transition focus:border-brand-primary focus:bg-brand-surface-secondary"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text-secondary">
                Audience Profile
              </label>
              <select
                className="w-full rounded-lg border border-brand-border bg-brand-surface-secondary px-3 py-2.5 text-sm font-medium text-brand-text-primary outline-none transition focus:border-brand-primary focus:bg-brand-surface-secondary"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as BusinessType)}
              >
                <option value="MSME">MSME Owner</option>
                <option value="Startup">Startup Founder</option>
                <option value="Founder">Leadership Team</option>
                <option value="Analyst">Business Analyst</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text-secondary">
                Sector / Industry
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-brand-border bg-brand-surface-secondary px-3 py-2.5 text-sm font-medium text-brand-text-primary placeholder-brand-text-secondary/50 outline-none transition focus:border-brand-primary focus:bg-brand-surface-secondary"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text-secondary">
              Financial Status and Inflow
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-brand-border bg-brand-surface-secondary px-3 py-2.5 text-sm font-medium text-brand-text-primary placeholder-brand-text-secondary/50 outline-none transition focus:border-brand-primary focus:bg-brand-surface-secondary"
              value={revenueDesc}
              onChange={(e) => setRevenueDesc(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text-secondary">
              Operational Cost of Capital
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-brand-border bg-brand-surface-secondary px-3 py-2.5 text-sm font-medium text-brand-text-primary placeholder-brand-text-secondary/50 outline-none transition focus:border-brand-primary focus:bg-brand-surface-secondary"
              value={burnRateDesc}
              onChange={(e) => setBurnRateDesc(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text-secondary">
              Immediate Strategic Goal
            </label>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-brand-border bg-brand-surface-secondary px-3 py-2.5 text-sm font-medium text-brand-text-primary placeholder-brand-text-secondary/50 outline-none transition focus:border-brand-primary focus:bg-brand-surface-secondary resize-none"
              value={strategicGoals}
              onChange={(e) => setStrategicGoals(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text-secondary">
              Operational Obstacles / Risks
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-brand-border bg-brand-surface-secondary px-3 py-2.5 text-sm font-medium text-brand-text-primary placeholder-brand-text-secondary/50 outline-none transition focus:border-brand-primary focus:bg-brand-surface-secondary"
              value={obstaclesDesc}
              onChange={(e) => setObstaclesDesc(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="relative w-full overflow-hidden rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-brand-text-primary transition hover:bg-brand-primary/90 hover:shadow-lg hover:shadow-brand-primary/25 disabled:opacity-75 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-brand-text-primary" />
                <span>Assembling Report...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Strategic Solution</span>
              </>
            )}
          </button>
        </form>

        {/* Right Side: Execution Dashboard / Loading Screen */}
        <div className="lg:col-span-7 h-full min-h-[500px] flex flex-col rounded-xl border border-brand-border bg-brand-surface-secondary p-6 relative justify-center overflow-hidden">
          
          {/* Subtle decoration grids */}
          <div className="absolute inset-0 subtle-grid opacity-20 pointer-events-none"></div>

          {/* Loader Overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex flex-col bg-brand-surface/95 z-20 p-8 animate-fade-in overflow-hidden">
              <div className="flex items-center justify-between mb-8 opacity-40">
                <div className="w-1/3 h-8 bg-brand-text-primary/10 rounded-lg animate-pulse"></div>
                <div className="w-24 h-8 bg-brand-text-primary/10 rounded-lg animate-pulse"></div>
              </div>
              <div className="space-y-6 mb-8 opacity-40">
                <div className="w-full h-32 bg-brand-text-primary/10 rounded-xl animate-pulse"></div>
                <div className="flex gap-4">
                  <div className="w-1/2 h-24 bg-brand-text-primary/10 rounded-xl animate-pulse"></div>
                  <div className="w-1/2 h-24 bg-brand-text-primary/10 rounded-xl animate-pulse"></div>
                </div>
              </div>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-brand-surface/60 backdrop-blur-sm">
                <h4 className="text-lg font-bold text-brand-text-primary tracking-tight mb-4">
                  Simulating Strategic Matrices
                </h4>
                <div className="flex items-center gap-3 bg-brand-surface-secondary/90 px-5 py-2.5 rounded-full border border-brand-border shadow-xl">
                  <span className="w-2 h-2 rounded-full bg-brand-primary animate-ping"></span>
                  <span className="text-xs font-mono text-brand-text-primary uppercase tracking-widest font-bold">
                    {loadingStep}
                  </span>
                </div>
                <p className="text-xs text-brand-text-secondary max-w-sm mt-6 leading-relaxed text-center bg-brand-surface/80 p-2 rounded">
                  Adviso client utilizes multi-agent processing systems to map scenario indicators and optimize structural viability scoring.
                </p>
              </div>
            </div>
          )}

          {/* Default State (Prior to Generation) */}
          {!isLoading && !report && !errorMsg && (
            <div className="text-center py-12 relative z-10 max-w-md mx-auto space-y-6">
              <div className="w-16 h-16 mx-auto rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                <Database className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-brand-text-primary tracking-tight mb-2">
                  Ready for Structural Asset Analysis
                </h4>
                <p className="text-sm text-brand-text-secondary leading-relaxed">
                  Provide your operational details and operational metrics framework. We will compile high-impact strategic directions, what-if forecasts, and security risk vectors.
                </p>
              </div>

              {/* Sample Quick Prefill Cards */}
              <div className="pt-2 text-left space-y-2">
                <span className="text-xs font-mono font-semibold uppercase text-brand-text-secondary tracking-widest block text-center">
                  Operational Profiles Available
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded border border-brand-border bg-brand-text-primary hover:border-brand-primary/30 transition cursor-pointer"
                    onClick={() => {
                      setBusinessName("EquiFlow Logistics");
                      setIndustry("Logistics & Supply Chain");
                      setRevenueDesc("$180,000 yearly revenue, high seasonality");
                      setBurnRateDesc("$8,500 recurring expenses");
                      setStrategicGoals("Minimize warehouse turnover and optimize pricing levels");
                      setObstaclesDesc("Uncertain client retention cycles");
                      setBusinessType("MSME");
                    }}
                  >
                    <span className="font-semibold block text-brand-text-primary mb-0.5">MSME Logistics</span>
                    <span className="text-[10px] text-brand-text-secondary">Seasonal, cost constraints</span>
                  </div>
                  <div className="p-2.5 rounded border border-brand-border bg-brand-text-primary hover:border-brand-primary/30 transition cursor-pointer"
                    onClick={() => {
                      setBusinessName("Solaria AI");
                      setIndustry("Enterprise software SaaS");
                      setRevenueDesc("$45,000 monthly recurring revenue");
                      setBurnRateDesc("$30,000 tech overhead");
                      setStrategicGoals("Achieve unit profitability before Series A round");
                      setObstaclesDesc("Competitive product pressure from legacy CRM");
                      setBusinessType("Startup");
                    }}
                  >
                    <span className="font-semibold block text-brand-text-primary mb-0.5">SaaS Startup</span>
                    <span className="text-[10px] text-brand-text-secondary">High margin, expansion push</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="text-center py-8 relative z-10 max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-brand-text-primary">Analysis Interrupted</h4>
                <p className="text-xs font-mono text-rose-400 mt-1">{errorMsg}</p>
                <p className="text-xs text-brand-text-secondary mt-3">
                  Please check your parameters and verify configuration parameters before submitting again.
                </p>
              </div>
            </div>
          )}

          {/* Success State: Dynamic Strategy Interactive Report */}
          {report && (
            <div className="relative z-10 w-full space-y-6 text-left animate-fade-in overflow-y-auto max-h-[520px] scroll-thin pr-1">
              
              {/* Header Scoring Row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-brand-border pb-4">
                <div>
                  <h4 className="text-xs font-mono text-brand-text-secondary uppercase tracking-wider">
                    Executive Strategic Report
                  </h4>
                  <h5 className="text-lg font-bold text-brand-text-primary mt-0.5">
                    {businessName || "Unnamed Enterprise"} - Tactical Solutions Map
                  </h5>
                </div>
                <div className="flex items-center gap-3 bg-brand-text-primary px-3.5 py-1.5 rounded-lg border border-brand-border">
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] text-brand-text-secondary font-mono">HEALTH SCORE</span>
                    <span className="text-sm font-bold text-brand-text-primary leading-none">
                      {report.score} <span className="text-xs text-brand-text-secondary">/ 100</span>
                    </span>
                  </div>
                  <div className="w-2.5 h-10 bg-brand-text-primary rounded overflow-hidden">
                    <div 
                      className="w-full bg-brand-primary" 
                      style={{ height: `${report.score}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Executive Summary */}
              <div className="bg-brand-text-primary p-4 rounded-xl border border-brand-border">
                <h6 className="text-[11px] font-mono text-brand-primary font-semibold uppercase tracking-widest mb-1">
                  TACTICAL DISCOVERY SYNOPSIS
                </h6>
                <p className="text-xs text-brand-text-primary leading-relaxed font-sans">
                  {report.reasoning}
                </p>
              </div>

              {/* Action Interventions Playbooks */}
              <div className="space-y-4">
                <h6 className="text-[10px] font-mono text-brand-text-secondary font-semibold uppercase tracking-wider">
                  HIGH-LEVERAGE DECISION INTERVENTIONS
                </h6>
                <div className="grid grid-cols-1 gap-4">
                  {report.recommendations.map((rec, rIdx) => {
                    const isHighImpact = rec.impact === "High";
                    return (
                      <div key={rIdx} className="border border-brand-border bg-brand-surface-secondary rounded-xl p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider ${
                              isHighImpact ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/25" : "bg-brand-text-primary text-brand-text-secondary border border-brand-border"
                            }`}>
                              {rec.impact} Impact
                            </span>
                            <h7 className="block text-sm font-bold text-brand-text-primary mt-1.5">
                              {rec.title}
                            </h7>
                          </div>
                          <div className="text-right">
                            <span className="block text-[9px] text-brand-text-secondary font-mono tracking-wider">CONFIDENCE</span>
                            <span className="text-xs font-mono font-bold text-brand-primary">
                              {rec.confidence}%
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-brand-text-secondary leading-relaxed">
                          {rec.justification}
                        </p>

                        {/* Interactive Steps Checklist */}
                        <div className="bg-brand-surface-secondary p-2.5 rounded-lg border border-brand-border space-y-2">
                          <span className="block text-[9px] text-brand-text-secondary font-mono uppercase tracking-widest">
                            EXECUTION ROADMAP (Interactive Checklist)
                          </span>
                          <div className="space-y-1.5">
                            {rec.actionSteps.map((step, sIdx) => {
                              const actionKey = `${rIdx}-${sIdx}`;
                              const isChecked = !!checkedActions[actionKey];
                              return (
                                <div 
                                  key={sIdx} 
                                  onClick={() => toggleAction(actionKey)}
                                  className="flex items-start gap-2.5 cursor-pointer hover:bg-brand-text-primary p-1 rounded transition select-none"
                                >
                                  <div className={`mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                                    isChecked 
                                      ? "bg-brand-primary border-brand-primary text-brand-text-primary" 
                                      : "border-brand-border bg-transparent text-transparent"
                                  }`}>
                                    <CheckCircle2 className="w-2.5 h-2.5 stroke-[3]" />
                                  </div>
                                  <span className={`text-xs transition-colors ${
                                    isChecked ? "text-brand-text-secondary/60 line-through" : "text-brand-text-primary/90"
                                  }`}>
                                    {step}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* What-If Operational Scenario Tests */}
              <div className="space-y-3">
                <h6 className="text-[10px] font-mono text-brand-text-secondary font-semibold uppercase tracking-wider">
                  SIMULATED SCENARIO OUTCOMES
                </h6>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {report.scenarioAnalysis.map((sc, scIdx) => {
                    const isHighRisk = sc.riskLevel === "High";
                    const isMedRisk = sc.riskLevel === "Medium";
                    return (
                      <div key={scIdx} className="bg-brand-text-primary p-3.5 rounded-xl border border-brand-border space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-mono font-medium text-brand-text-primary/90 truncate">
                            {sc.scenario}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono uppercase ${
                            isHighRisk ? "bg-rose-500/15 text-rose-400 border border-rose-500/20" :
                            isMedRisk ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" :
                            "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                          }`}>
                            {sc.riskLevel} Risk
                          </span>
                        </div>
                        <p className="text-[11px] text-brand-text-secondary leading-normal">
                          {sc.outcome}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Strategic KPI Forecast Projection */}
              {report.kpiForecast && report.kpiForecast.length > 0 && (
                <div className="bg-brand-surface-secondary p-4 rounded-xl border border-brand-border space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-3.5 h-3.5 text-brand-primary" />
                    <h6 className="text-[10px] font-mono text-brand-text-secondary font-semibold uppercase tracking-wider">
                      DEVELOPMENT AND GROWTH INDEX PROJECTIONS
                    </h6>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] font-mono text-brand-text-secondary">
                      <thead>
                        <tr className="border-b border-brand-border text-left">
                          <th className="pb-1.5 font-medium">TIMEFRAME</th>
                          <th className="pb-1.5 font-medium text-right">REVENUE INDEX</th>
                          <th className="pb-1.5 font-medium text-right">EFFICIENCY CAPABILITY</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {report.kpiForecast.map((k, kIdx) => (
                          <tr key={kIdx} className="hover:bg-brand-text-primary">
                            <td className="py-1.5 text-brand-text-primary font-sans">{k.timeframe}</td>
                            <td className="py-1.5 text-right text-brand-primary font-bold">
                              {k.revenueGrowthRate.toFixed(2)}x
                            </td>
                            <td className="py-1.5 text-right text-emerald-400">
                              {k.efficiencyFactor.toFixed(2)}x
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-brand-text-secondary italic mt-1 leading-normal">
                    This forecast measures operational velocity targets mathematically compiled from input metrics.
                  </p>
                </div>
              )}

              {/* Reset Control */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setReport(null);
                    setCheckedActions({});
                  }}
                  className="flex items-center gap-2 text-xs font-semibold text-brand-text-secondary hover:text-brand-text-primary transition"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Configure Alternate Scenario</span>
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
