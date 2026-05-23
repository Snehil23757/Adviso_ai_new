import { Router } from "express";
import { generateStrategicReport, BusinessDataInput } from "../services/geminiService.js";

const router = Router();

// Health check route
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "Adviso AI - Decision Intelligence Layer"
  });
});

// Social metrics & initial simulation data
router.get("/metrics", (req, res) => {
  res.json({
    avgDecisionReductionDays: 95, // 95% faster decision cycles
    manualAnalysisTimeReduction: 40, // 40% reduction in manual analyses
    activeAgentsSimulated: 1420,
    recommendationsGeneratedTotal: 12480,
    supportedPipelines: ["CRM", "Spreadsheets", "Stripe", "QuickBooks", "ERP", "Analytics Hub"],
  });
});

// Strategic AI advisory analyzer endpoint
router.post("/analyze", async (req, res) => {
  try {
    const {
      businessName,
      businessType,
      industry,
      revenueDesc,
      burnRateDesc,
      strategicGoals,
      obstaclesDesc,
    } = req.body;

    if (!businessType || !industry || !strategicGoals) {
      res.status(400).json({
        error: "Missing mandatory fields. BusinessType, Industry, and StrategicGoals are required."
      });
      return;
    }

    const payload: BusinessDataInput = {
      businessName: businessName || "",
      businessType: businessType as "MSME" | "Startup" | "Founder" | "Analyst",
      industry: industry || "",
      revenueDesc: revenueDesc || "",
      burnRateDesc: burnRateDesc || "",
      strategicGoals: strategicGoals || "",
      obstaclesDesc: obstaclesDesc || "",
    };

    const report = await generateStrategicReport(payload);
    res.json({ success: true, report });
  } catch (error: any) {
    console.error("API error during Adviso business analysis request:", error);
    res.status(500).json({
      error: "Strategic recommendation engine failed.",
      details: error?.message || "Internal Server Error"
    });
  }
});

export default router;
