export type PlanId = "free" | "go" | "pro" | "enterprise";

export type DashboardTabId =
  | "Overview"
  | "Charts"
  | "AI"
  | "Chat"
  | "Ideas"
  | "Profit"
  | "Forecast"
  | "Budget"
  | "Sustainability"
  | "Competitor"
  | "KPI";

export type FeatureKey =
  | "upload.csv"
  | "export.csv"
  | "ai.insights"
  | "ai.chat"
  | "ideas.generate"
  | "budget.plan"
  | "charts.visualize"
  | "profit.analyze"
  | "forecast.run"
  | "competitor.analyze"
  | "kpi.monitor"
  | "esg.analyze"
  | "team.manage"
  | "enterprise.controls";

export type RouteKey = "dashboard" | `dashboard.tab.${DashboardTabId}`;

export interface PlanDefinition {
  id: PlanId;
  name: string;
  badge: string;
  description: string;
  upgradeCta: string;
  monthlyPriceLabel: string;
  creditLimit: number;
  tabs: DashboardTabId[];
  features: Partial<Record<FeatureKey, boolean>>;
  routes: RouteKey[];
}

export const DASHBOARD_TAB_ORDER: DashboardTabId[] = [
  "Overview",
  "Charts",
  "AI",
  "Chat",
  "Ideas",
  "Profit",
  "Forecast",
  "Budget",
  "Sustainability",
  "Competitor",
  "KPI",
];

export const TAB_FEATURES: Record<DashboardTabId, FeatureKey> = {
  Overview: "upload.csv",
  Charts: "charts.visualize",
  AI: "ai.insights",
  Chat: "ai.chat",
  Ideas: "ideas.generate",
  Profit: "profit.analyze",
  Forecast: "forecast.run",
  Budget: "budget.plan",
  Sustainability: "esg.analyze",
  Competitor: "competitor.analyze",
  KPI: "kpi.monitor",
};

const routeForTab = (tab: DashboardTabId): RouteKey => `dashboard.tab.${tab}`;

function routesForTabs(tabs: DashboardTabId[]): RouteKey[] {
  return ["dashboard", ...tabs.map(routeForTab)];
}

const FREE_TABS: DashboardTabId[] = ["Overview", "Chat"];
const GO_TABS: DashboardTabId[] = ["Overview", "Chat", "Ideas", "Budget"];
const PRO_TABS: DashboardTabId[] = ["Overview", "Charts", "AI", "Chat", "Profit", "Forecast", "Competitor"];
const ENTERPRISE_TABS = DASHBOARD_TAB_ORDER;

export const PLAN_DEFINITIONS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    badge: "FREE",
    description: "Basic workspace access for CSV upload and first-pass review.",
    upgradeCta: "Start Free",
    monthlyPriceLabel: "Free",
    creditLimit: 10,
    tabs: FREE_TABS,
    routes: routesForTabs(FREE_TABS),
    features: {
      "upload.csv": true,
      "ai.chat": true,
    },
  },
  go: {
    id: "go",
    name: "Go",
    badge: "GO",
    description: "Focused operator workspace with chat, ideas, and budget planning.",
    upgradeCta: "Upgrade to GO",
    monthlyPriceLabel: "INR 79/mo",
    creditLimit: 150,
    tabs: GO_TABS,
    routes: routesForTabs(GO_TABS),
    features: {
      "upload.csv": true,
      "ai.chat": true,
      "ideas.generate": true,
      "budget.plan": true,
      "ai.insights": true,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    badge: "PRO",
    description: "Advanced analytics, forecasting, and competitive intelligence.",
    upgradeCta: "Upgrade to PRO",
    monthlyPriceLabel: "INR 399/mo",
    creditLimit: 1000,
    tabs: PRO_TABS,
    routes: routesForTabs(PRO_TABS),
    features: {
      "upload.csv": true,
      "export.csv": true,
      "charts.visualize": true,
      "ai.insights": true,
      "ai.chat": true,
      "profit.analyze": true,
      "forecast.run": true,
      "competitor.analyze": true,
    },
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    badge: "ENTERPRISE",
    description: "All tabs, advanced analytics, team tools, and enterprise controls.",
    upgradeCta: "Upgrade to ENTERPRISE",
    monthlyPriceLabel: "INR 3,999/mo",
    creditLimit: 10000,
    tabs: ENTERPRISE_TABS,
    routes: routesForTabs(ENTERPRISE_TABS),
    features: {
      "upload.csv": true,
      "export.csv": true,
      "ai.insights": true,
      "ai.chat": true,
      "ideas.generate": true,
      "budget.plan": true,
      "charts.visualize": true,
      "profit.analyze": true,
      "forecast.run": true,
      "competitor.analyze": true,
      "kpi.monitor": true,
      "esg.analyze": true,
      "team.manage": true,
      "enterprise.controls": true,
    },
  },
};

export const UPGRADE_PLAN_ORDER: PlanId[] = ["go", "pro", "enterprise"];
export const PLAN_UPGRADE_PATH: PlanId[] = ["free", "go", "pro", "enterprise"];

export function isPlanId(value: string | null | undefined): value is PlanId {
  return Boolean(value && value in PLAN_DEFINITIONS);
}

export function recommendedPlanForFeature(feature: FeatureKey): PlanId {
  return UPGRADE_PLAN_ORDER.find((planId) => PLAN_DEFINITIONS[planId].features[feature]) || "enterprise";
}

export function recommendedPlanForTab(tab: DashboardTabId): PlanId {
  return UPGRADE_PLAN_ORDER.find((planId) => PLAN_DEFINITIONS[planId].tabs.includes(tab)) || "enterprise";
}

export function nextPlanAfter(planId: PlanId): PlanId | null {
  const index = PLAN_UPGRADE_PATH.indexOf(planId);
  if (index < 0 || index >= PLAN_UPGRADE_PATH.length - 1) return null;
  return PLAN_UPGRADE_PATH[index + 1];
}

export function hasFeature(plan: PlanDefinition, feature: FeatureKey) {
  return Boolean(plan.features[feature]);
}

export function hasRoute(plan: PlanDefinition, route: RouteKey) {
  return plan.routes.includes(route);
}

export function hasTab(plan: PlanDefinition, tab: DashboardTabId) {
  return plan.tabs.includes(tab);
}
