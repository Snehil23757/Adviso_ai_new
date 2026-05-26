import React from "react";
import {
  BarChart2,
  BrainCircuit,
  ChartDonut,
  Compass,
  Database,
  DollarSign,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Leaf,
  Lightbulb,
  MessageSquare,
  PieChart,
  Shield,
  Table,
  Target,
  TrendingUp,
  User,
} from "lucide-react";

import type { DashboardTabId, FeatureKey, PlanId } from "../../subscriptions/permissions";

export type PlatformServiceStatus = "live" | "premium" | "planned";

export type PlatformServiceId =
  | "home"
  | "workspaces"
  | "recent-reports"
  | "data-workspace"
  | "visual-analytics"
  | "kpi-dashboard"
  | "data-quality"
  | "ai-insights"
  | "data-chat"
  | "action-plan"
  | "decision-brief"
  | "what-if-simulator"
  | "forecasting"
  | "budget-runway"
  | "profit-pricing"
  | "msme-toolkit"
  | "startup-toolkit"
  | "founder-dashboard"
  | "business-analyst-reports"
  | "sustainability"
  | "competitor-intelligence"
  | "account-settings"
  | "audit-trail"
  | "team-members"
  | "integrations"
  | "billing";

export interface PlatformServiceItem {
  id: PlatformServiceId;
  label: string;
  description: string;
  icon: React.ReactNode;
  tab?: DashboardTabId;
  feature?: FeatureKey;
  status: PlatformServiceStatus;
  requiredPlan?: PlanId;
  backend: "connected" | "planned";
}

export interface PlatformNavSection {
  label: string;
  items: PlatformServiceItem[];
}

export const PLATFORM_NAV_SECTIONS: PlatformNavSection[] = [
  {
    label: "Home",
    items: [
      {
        id: "home",
        label: "Home",
        description: "Workspace launchpad with onboarding, usage, and next actions.",
        icon: <FileSpreadsheet className="w-4 h-4" />,
        tab: "Overview",
        feature: "upload.csv",
        status: "live",
        backend: "connected",
      },
      {
        id: "workspaces",
        label: "Workspaces",
        description: "Manage datasets and workspace-level business context.",
        icon: <Database className="w-4 h-4" />,
        feature: "upload.csv",
        status: "planned",
        backend: "planned",
      },
      {
        id: "recent-reports",
        label: "Recent Reports",
        description: "A report library for AI briefs generated from previous datasets.",
        icon: <ChartDonut className="w-4 h-4" />,
        feature: "ai.insights",
        status: "planned",
        requiredPlan: "go",
        backend: "planned",
      },
    ],
  },
  {
    label: "Data Intelligence",
    items: [
      {
        id: "data-workspace",
        label: "Data Workspace",
        description: "Import, validate, profile, and curate active analysis columns.",
        icon: <Table className="w-4 h-4" />,
        tab: "Overview",
        feature: "upload.csv",
        status: "live",
        backend: "connected",
      },
      {
        id: "visual-analytics",
        label: "Visual Analytics",
        description: "Charts, distributions, correlations, drilldowns, and BI views.",
        icon: <BarChart2 className="w-4 h-4" />,
        tab: "Charts",
        feature: "charts.visualize",
        status: "live",
        requiredPlan: "pro",
        backend: "connected",
      },
      {
        id: "kpi-dashboard",
        label: "KPI Dashboard",
        description: "KPI summaries, monitoring, and trend context.",
        icon: <Target className="w-4 h-4" />,
        tab: "KPI",
        feature: "kpi.monitor",
        status: "live",
        requiredPlan: "enterprise",
        backend: "connected",
      },
      {
        id: "data-quality",
        label: "Data Quality",
        description: "Quality scoring, anomalies, missingness, and schema health checks.",
        icon: <Shield className="w-4 h-4" />,
        feature: "charts.visualize",
        status: "premium",
        requiredPlan: "pro",
        backend: "planned",
      },
    ],
  },
  {
    label: "AI Advisory",
    items: [
      {
        id: "ai-insights",
        label: "AI Insights",
        description: "Backend-generated executive insights and data narratives.",
        icon: <BrainCircuit className="w-4 h-4" />,
        tab: "AI",
        feature: "ai.insights",
        status: "live",
        requiredPlan: "go",
        backend: "connected",
      },
      {
        id: "data-chat",
        label: "Data Chat",
        description: "Ask questions against the active dataset with authenticated backend calls.",
        icon: <MessageSquare className="w-4 h-4" />,
        tab: "Chat",
        feature: "ai.chat",
        status: "live",
        backend: "connected",
      },
      {
        id: "action-plan",
        label: "Action Plan",
        description: "Convert insights into prioritized tasks, owners, and follow-up actions.",
        icon: <Lightbulb className="w-4 h-4" />,
        feature: "ideas.generate",
        status: "premium",
        requiredPlan: "go",
        backend: "planned",
      },
      {
        id: "decision-brief",
        label: "Decision Brief",
        description: "Generate shareable board-ready briefs from datasets and AI findings.",
        icon: <FileText className="w-4 h-4" />,
        feature: "ai.insights",
        status: "premium",
        requiredPlan: "go",
        backend: "planned",
      },
    ],
  },
  {
    label: "Planning & Simulation",
    items: [
      {
        id: "what-if-simulator",
        label: "What-if Simulator",
        description: "Scenario modeling for revenue, cost, runway, and demand assumptions.",
        icon: <Compass className="w-4 h-4" />,
        feature: "forecast.run",
        status: "premium",
        requiredPlan: "pro",
        backend: "planned",
      },
      {
        id: "forecasting",
        label: "Forecasting",
        description: "Forecast-ready numeric fields with trend projections and uncertainty bands.",
        icon: <TrendingUp className="w-4 h-4" />,
        tab: "Forecast",
        feature: "forecast.run",
        status: "live",
        requiredPlan: "pro",
        backend: "connected",
      },
      {
        id: "budget-runway",
        label: "Budget & Runway",
        description: "Budget traces, concentration views, and spending hotspot detection.",
        icon: <PieChart className="w-4 h-4" />,
        tab: "Budget",
        feature: "budget.plan",
        status: "live",
        requiredPlan: "go",
        backend: "connected",
      },
      {
        id: "profit-pricing",
        label: "Profit & Pricing",
        description: "Profitability, margin, pricing, and cost leakage diagnostics.",
        icon: <DollarSign className="w-4 h-4" />,
        tab: "Profit",
        feature: "profit.analyze",
        status: "live",
        requiredPlan: "pro",
        backend: "connected",
      },
    ],
  },
  {
    label: "Business Modules",
    items: [
      {
        id: "msme-toolkit",
        label: "MSME Toolkit",
        description: "Templates and guided diagnostics for smaller business workflows.",
        icon: <ChartDonut className="w-4 h-4" />,
        feature: "ideas.generate",
        status: "planned",
        requiredPlan: "go",
        backend: "planned",
      },
      {
        id: "startup-toolkit",
        label: "Startup Toolkit",
        description: "Runway, growth, pricing, and investor-prep modules for founders.",
        icon: <TrendingUp className="w-4 h-4" />,
        feature: "forecast.run",
        status: "planned",
        requiredPlan: "pro",
        backend: "planned",
      },
      {
        id: "founder-dashboard",
        label: "Founder Dashboard",
        description: "A founder cockpit for milestones, KPIs, runway, and strategic alerts.",
        icon: <Compass className="w-4 h-4" />,
        feature: "enterprise.controls",
        status: "premium",
        requiredPlan: "enterprise",
        backend: "planned",
      },
      {
        id: "business-analyst-reports",
        label: "Business Analyst Reports",
        description: "Recurring analyst-style reports generated from business datasets.",
        icon: <FileText className="w-4 h-4" />,
        feature: "ai.insights",
        status: "premium",
        requiredPlan: "pro",
        backend: "planned",
      },
      {
        id: "sustainability",
        label: "Sustainability",
        description: "ESG and impact concentration analysis.",
        icon: <Leaf className="w-4 h-4" />,
        tab: "Sustainability",
        feature: "esg.analyze",
        status: "live",
        requiredPlan: "enterprise",
        backend: "connected",
      },
      {
        id: "competitor-intelligence",
        label: "Competitor Intel",
        description: "Competitive positioning, market risk, and benchmark comparison.",
        icon: <Shield className="w-4 h-4" />,
        tab: "Competitor",
        feature: "competitor.analyze",
        status: "live",
        requiredPlan: "pro",
        backend: "connected",
      },
    ],
  },
  {
    label: "Settings",
    items: [
      {
        id: "account-settings",
        label: "Account",
        description: "Profile, plan, billing history, preferences, and security settings.",
        icon: <User className="w-4 h-4" />,
        feature: "upload.csv",
        status: "live",
        backend: "connected",
      },
    ],
  },
  {
    label: "Trust & Admin",
    items: [
      {
        id: "audit-trail",
        label: "Audit Trail",
        description: "Track dataset imports, payment events, access, and AI activity.",
        icon: <Shield className="w-4 h-4" />,
        feature: "enterprise.controls",
        status: "premium",
        requiredPlan: "enterprise",
        backend: "planned",
      },
      {
        id: "team-members",
        label: "Team Members",
        description: "Invite teammates, roles, permissions, and collaborative workspaces.",
        icon: <HelpCircle className="w-4 h-4" />,
        feature: "team.manage",
        status: "premium",
        requiredPlan: "enterprise",
        backend: "planned",
      },
      {
        id: "integrations",
        label: "Integrations",
        description: "Connect CRM, accounting, analytics, and payment data sources.",
        icon: <Database className="w-4 h-4" />,
        feature: "enterprise.controls",
        status: "premium",
        requiredPlan: "enterprise",
        backend: "planned",
      },
      {
        id: "billing",
        label: "Billing",
        description: "Subscription, invoices, payment history, and Razorpay billing controls.",
        icon: <DollarSign className="w-4 h-4" />,
        feature: "upload.csv",
        status: "planned",
        backend: "planned",
      },
    ],
  },
];

export const PLATFORM_SERVICE_ITEMS = PLATFORM_NAV_SECTIONS.flatMap((section) => section.items);

export function getPlatformService(id: PlatformServiceId) {
  return PLATFORM_SERVICE_ITEMS.find((item) => item.id === id) || PLATFORM_SERVICE_ITEMS[0];
}

export function serviceForDashboardTab(tab: DashboardTabId) {
  return PLATFORM_SERVICE_ITEMS.find((item) => item.tab === tab) || PLATFORM_SERVICE_ITEMS[0];
}
