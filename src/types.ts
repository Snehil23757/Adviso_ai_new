export interface StrategicReport {
  score: number;
  reasoning: string;
  recommendations: Array<{
    title: string;
    impact: "High" | "Medium" | "Low";
    confidence: number;
    justification: string;
    actionSteps: string[];
  }>;
  scenarioAnalysis: Array<{
    scenario: string;
    outcome: string;
    riskLevel: "High" | "Medium" | "Low";
  }>;
  kpiForecast: Array<{
    timeframe: string;
    revenueGrowthRate: number;
    efficiencyFactor: number;
  }>;
}

export interface MetricSummary {
  avgDecisionReductionDays: number;
  manualAnalysisTimeReduction: number;
  activeAgentsSimulated: number;
  recommendationsGeneratedTotal: number;
  supportedPipelines: string[];
}
