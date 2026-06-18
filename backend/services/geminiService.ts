export interface BusinessDataInput {
  businessName?: string;
  businessType: "MSME" | "Startup" | "Founder" | "Analyst";
  industry: string;
  revenueDesc?: string;
  burnRateDesc?: string;
  strategicGoals: string;
  obstaclesDesc?: string;
}

export interface StrategicRecommendationReport {
  score: number; // overall strategic health indicator, 0 to 100
  reasoning: string; // executive tactical insight summary
  recommendations: Array<{
    title: string;
    impact: "High" | "Medium" | "Low";
    confidence: number; // probability score of success (percentage)
    justification: string; // supporting data points & explainability justification
    actionSteps: string[]; // checklist action items
  }>;
  scenarioAnalysis: Array<{
    scenario: string; // What-If scenario (e.g. increase marketing budget by 20%)
    outcome: string; // Projected operational impact
    riskLevel: "High" | "Medium" | "Low";
  }>;
  kpiForecast: Array<{
    timeframe: string; // Q1, Q2, Q3, Q4
    revenueGrowthRate: number; // growth index scale
    efficiencyFactor: number; // efficiency index scale
  }>;
}

// Generates fallback mock output if API key is not available
export function getMockReport(input: BusinessDataInput): StrategicRecommendationReport {
  const isMSME = input.businessType === "MSME";
  const isStartup = input.businessType === "Startup";
  
  return {
    score: 72 + Math.floor(Math.random() * 18),
    reasoning: `Based on an analysis of ${input.businessName || "your business"} in the ${input.industry} sector, we found that optimizing ${isMSME ? "inventory reserves and local client pipelines" : "product-market retention metrics and lean capital runways"} represents your primary leverage point. Your strategic goal "${input.strategicGoals}" is viable, provided operational efficiency offsets the highlighted risks.`,
    recommendations: [
      {
        title: isMSME ? "Supply Chain & Working Capital Stabilization" : "Runway Extension via High-Impact Marketing Re-allocation",
        impact: "High",
        confidence: 88,
        justification: `Current estimates indicate that adjusting resources to emphasize ${isMSME ? "high-velocity vendors" : "organic growth experiments"} preserves capital while retaining target operational momentum.`,
        actionSteps: [
          isMSME ? "Re-negotiate credit terms with core suppliers by 15 days." : "Audit all SaaS tooling and consolidate idle licenses.",
          "Redirect 10% of auxiliary budget to key acquisition channels.",
          "Establish secondary sourcing backups to mitigate fulfillment bottlenecks."
        ]
      },
      {
        title: "Dynamic Operational Scenario Modeling",
        impact: "Medium",
        confidence: 76,
        justification: "Systematic review of internal pipeline conversion tells us that even modest 3% increases in pricing can expand profit margin without major acquisition overheads.",
        actionSteps: [
          "Establish weekly team KPI review rituals focusing on unit margins.",
          "Run a pilot price adjustment on a 5% sample cohort.",
          "Document client churn patterns to optimize subsequent offer matrices."
        ]
      }
    ],
    scenarioAnalysis: [
      {
        scenario: "Adjust operational capital allocation by 15% towards core goals",
        outcome: "Accelerates runway by an estimated 3.5 months, boosting immediate strategic alignment.",
        riskLevel: "Low"
      },
      {
        scenario: "Aggressive price scaling of core services (+12%)",
        outcome: "Increases gross margins by 8.4% with potential short-term customer attrition risk under 2%.",
        riskLevel: "Medium"
      }
    ],
    kpiForecast: [
      { timeframe: "Current", revenueGrowthRate: 1.0, efficiencyFactor: 1.0 },
      { timeframe: "Projected Q1", revenueGrowthRate: 1.12, efficiencyFactor: 1.15 },
      { timeframe: "Projected Q2", revenueGrowthRate: 1.25, efficiencyFactor: 1.28 },
      { timeframe: "Projected Q3", revenueGrowthRate: 1.40, efficiencyFactor: 1.35 },
      { timeframe: "Projected Q4", revenueGrowthRate: 1.58, efficiencyFactor: 1.42 }
    ]
  };
}

export async function generateStrategicReport(input: BusinessDataInput): Promise<StrategicRecommendationReport> {
  return getMockReport(input);
}
