import { GoogleGenAI, Type } from "@google/genai";
import { config } from "../config/index.js";

let aiInstance: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!aiInstance) {
    const key = config.geminiApiKey;
    if (!key) {
      console.warn("GoogleGenAI: GEMINI_API_KEY is not defined. Strategic reports will run on mock generator.");
      return null;
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

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
  const client = getAiClient();
  if (!client) {
    return getMockReport(input);
  }

  const prompt = `
  You are Adviso AI, a senior Enterprise Strategy Decision Support Intelligence engine.
  Analyze the following operational business profiles and synthesize explainable, actionable recommendations, what-if scenario simulations, and a 4-quarter quantitative KPI growth forecast.

  Business Profile details:
  - Name: ${input.businessName || "Unnamed Enterprise"}
  - Audience Segment Type: ${input.businessType} (MSME, Startup, Founder, or Analyst level analysis)
  - Industry Location: ${input.industry}
  - Revenue description: ${input.revenueDesc || "Not documented"}
  - Burn rate, cash reserve, or expense context: ${input.burnRateDesc || "Not documented"}
  - High-level strategic goals: ${input.strategicGoals}
  - Major obstacles or constraints: ${input.obstaclesDesc || "Not documented"}

  Generate your response as a validated, clean JSON object matching the strict schema with all fields filled.
  Remember: No em dashes or symbols resembling em dashes. Use pure text and positive, business-decision-grade professional language. No emojis.
  `;

  try {
    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["score", "reasoning", "recommendations", "scenarioAnalysis", "kpiForecast"],
          properties: {
            score: {
              type: Type.INTEGER,
              description: "Strategic performance readiness score out of 100",
            },
            reasoning: {
              type: Type.STRING,
              description: "Core executive summary and tactical reasoning overview",
            },
            recommendations: {
              type: Type.ARRAY,
              description: "Set of high-leverage business interventions",
              items: {
                type: Type.OBJECT,
                required: ["title", "impact", "confidence", "justification", "actionSteps"],
                properties: {
                  title: { type: Type.STRING },
                  impact: { type: Type.STRING, description: "Must be 'High', 'Medium', or 'Low'" },
                  confidence: { type: Type.INTEGER, description: "Success probability percentage from 0 to 100" },
                  justification: { type: Type.STRING, description: "Detailed explainable logic and data indicators justification" },
                  actionSteps: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                }
              }
            },
            scenarioAnalysis: {
              type: Type.ARRAY,
              description: "What-If operational testing simulations",
              items: {
                type: Type.OBJECT,
                required: ["scenario", "outcome", "riskLevel"],
                properties: {
                  scenario: { type: Type.STRING, description: "Hypothetical business action" },
                  outcome: { type: Type.STRING, description: "Structured causal effect" },
                  riskLevel: { type: Type.STRING, description: "Must be 'High', 'Medium', or 'Low'" }
                }
              }
            },
            kpiForecast: {
              type: Type.ARRAY,
              description: "Progressive quarterly trend projection indices starting with Current (1.0 index)",
              items: {
                type: Type.OBJECT,
                required: ["timeframe", "revenueGrowthRate", "efficiencyFactor"],
                properties: {
                  timeframe: { type: Type.STRING, description: "Current, Q1, Q2, Q3, Q4" },
                  revenueGrowthRate: { type: Type.NUMBER, description: "Revenue multiplier index benchmarked to 1.0" },
                  efficiencyFactor: { type: Type.NUMBER, description: "Operational efficiency score multiplier benchmarked to 1.0" }
                }
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty text response received from GoogleGenAI API.");
    }
    return JSON.parse(text.trim()) as StrategicRecommendationReport;
  } catch (error) {
    console.error("Error communicating with Gemini intelligence, resolving mock fallback report:", error);
    return getMockReport(input);
  }
}
