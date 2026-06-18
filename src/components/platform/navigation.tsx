import React from "react";
import {
  BarChart2,
  BrainCircuit,
  Compass,
  Database,
  DollarSign,
  FileSpreadsheet,
  FileText,
  HelpCircle,
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
  | "datasets"
  | "data-preview"
  | "workspaces"
  | "visual-analytics"
  | "data-quality"
  | "ai-insights"
  | "data-chat"
  | "action-plan"
  | "decision-brief"
  | "what-if-simulator"
  | "forecasting"
  | "budget-runway"
  | "profit-pricing"
  | "founder-dashboard"
  | "reports"
  | "account-settings"
  | "support-center"
  | "audit-trail"
  | "team-members";

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
        icon: <Compass className="w-4 h-4" />,
        tab: "Overview",
        feature: "upload.csv",
        status: "live",
        backend: "connected",
      },
    ],
  },
  {
    label: "Data",
    items: [
      {
        id: "datasets",
        label: "Datasets",
        description: "Upload CSV datasets, add business context, and launch backend analysis.",
        icon: <FileSpreadsheet className="w-4 h-4" />,
        feature: "upload.csv",
        status: "live",
        backend: "connected",
      },
      {
        id: "data-preview",
        label: "Data Explorer",
        description: "Preview uploaded records, schema, quality, and AI-ready dataset context.",
        icon: <Table className="w-4 h-4" />,
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
        id: "data-quality",
        label: "AI KPI Discovery",
        description: "Identify business areas, recommended focus, and available KPI paths from the uploaded dataset.",
        icon: <Target className="w-4 h-4" />,
        feature: "upload.csv",
        status: "live",
        backend: "connected",
      },
    ],
  },
  {
    label: "AI Analysis",
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
        label: "AI Chat",
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
        tab: "Ideas",
        feature: "ideas.generate",
        status: "live",
        requiredPlan: "go",
        backend: "connected",
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
        label: "What-If Simulator",
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
    label: "Business Context",
    items: [
      {
        id: "workspaces",
        label: "Business Context",
        description: "Add business context, workspace metadata, and operating assumptions.",
        icon: <Database className="w-4 h-4" />,
        feature: "upload.csv",
        status: "planned",
        backend: "planned",
      },
      {
        id: "founder-dashboard",
        label: "Founder Dashboard",
        description: "A founder cockpit for milestones, KPIs, runway, and strategic alerts.",
        icon: <User className="w-4 h-4" />,
        feature: "enterprise.controls",
        status: "premium",
        requiredPlan: "enterprise",
        backend: "planned",
      },
    ],
  },
  {
    label: "Reports",
    items: [
      {
        id: "reports",
        label: "Reports",
        description: "Export reports, AI briefs, and reusable decision documents.",
        icon: <FileText className="w-4 h-4" />,
        feature: "export.csv",
        status: "planned",
        requiredPlan: "go",
        backend: "planned",
      },
    ],
  },
  {
    label: "Admin",
    items: [
      {
        id: "team-members",
        label: "Team Members",
        description: "Invite teammates, roles, permissions, and collaborative workspaces.",
        icon: <User className="w-4 h-4" />,
        feature: "team.manage",
        status: "premium",
        requiredPlan: "enterprise",
        backend: "planned",
      },
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
      {
        id: "support-center",
        label: "Support",
        description: "Contact support, view guidance, and send workspace feedback.",
        icon: <HelpCircle className="w-4 h-4" />,
        feature: "upload.csv",
        status: "live",
        backend: "connected",
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
