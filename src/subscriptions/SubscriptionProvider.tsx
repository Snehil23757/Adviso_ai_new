import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { authorizedFetch, readApiJson } from "../config";
import { useAuth } from "../lib/AuthContext.tsx";
import {
  DASHBOARD_TAB_ORDER,
  PLAN_DEFINITIONS,
  TAB_FEATURES,
  hasFeature,
  hasRoute,
  hasTab,
  isPlanId,
  nextPlanAfter,
  recommendedPlanForFeature as getRecommendedPlanIdForFeature,
  recommendedPlanForTab as getRecommendedPlanIdForTab,
  type DashboardTabId,
  type FeatureKey,
  type PlanDefinition,
  type PlanId,
  type RouteKey,
} from "./permissions";

interface SubscriptionSnapshot {
  source: "backend" | "unavailable";
  planId: PlanId;
  plan: PlanDefinition;
  creditsRemaining: number | null;
  storageKey: null;
  upgradedAt: string | null;
  loading: boolean;
  error: string;
  planType: "owner" | "premium" | "free";
  subscriptionStatus: "active" | "expired" | "cancelled" | string;
  trial: TrialSnapshot;
  trialExpired: boolean;
  effectivePlanId: string;
  accessLevel: "full" | "paid" | "free" | string;
}

export interface TrialSnapshot {
  active: boolean;
  expired: boolean;
  status: string;
  start_date: string | null;
  end_date: string | null;
  days_remaining: number;
  seconds_remaining: number;
  warning_level: "blue" | "yellow" | "orange" | "red" | "expired" | "none" | string;
  trial_days: number;
}

interface BackendSession {
  success: boolean;
  user: {
    id: number;
    firebase_uid: string;
    email: string;
    full_name: string;
    profile_picture: string;
    plan_id: string;
    is_admin: boolean;
    created_at: string;
    updated_at: string;
    last_login: string | null;
  };
  access_level?: "full" | "paid" | "free" | string;
  subscription: {
    plan_id: string;
    status: string;
    start_date?: string;
    end_date?: string | null;
    credits_remaining?: number | null;
    plan_type?: "owner" | "premium" | "free";
    subscription_status?: string;
    trial?: Partial<TrialSnapshot>;
    trial_expired?: boolean;
    effective_plan_id?: string;
    access_level?: "full" | "paid" | "free" | string;
  };
  permissions: {
    features: Record<string, boolean>;
    tabs: string[];
    routes: string[];
  };
}

interface PermissionContextValue {
  subscription: SubscriptionSnapshot;
  plans: Record<PlanId, PlanDefinition>;
  availableTabs: DashboardTabId[];
  lockedTabs: DashboardTabId[];
  canUseFeature: (feature: FeatureKey) => boolean;
  canAccessTab: (tab: DashboardTabId) => boolean;
  canAccessRoute: (route: RouteKey) => boolean;
  requiredFeatureForTab: (tab: DashboardTabId) => FeatureKey;
  recommendedPlanForFeature: (feature: FeatureKey) => PlanDefinition;
  recommendedPlanForTab: (tab: DashboardTabId) => PlanDefinition;
  nextUpgradePlan: PlanDefinition | null;
  refreshSubscription: (options?: RefreshSubscriptionOptions) => Promise<void>;
  upgradeMessage: string;
  clearUpgradeMessage: () => void;
}

const PermissionContext = createContext<PermissionContextValue | null>(null);

const EMPTY_TRIAL: TrialSnapshot = {
  active: false,
  expired: false,
  status: "none",
  start_date: null,
  end_date: null,
  days_remaining: 0,
  seconds_remaining: 0,
  warning_level: "none",
  trial_days: 0,
};

function normalizeTrial(value?: Partial<TrialSnapshot>): TrialSnapshot {
  return {
    ...EMPTY_TRIAL,
    ...(value || {}),
    active: Boolean(value?.active),
    expired: Boolean(value?.expired),
    start_date: value?.start_date || null,
    end_date: value?.end_date || null,
    days_remaining: Number(value?.days_remaining || 0),
    seconds_remaining: Number(value?.seconds_remaining || 0),
    trial_days: Number(value?.trial_days || 0),
  };
}

interface RefreshSubscriptionOptions {
  notify?: boolean;
}

function fallbackFeatures(plan: PlanDefinition) {
  return Object.fromEntries(Object.entries(plan.features).map(([feature, enabled]) => [feature, Boolean(enabled)]));
}

function featureEnabled(features: Record<string, boolean>, feature: FeatureKey) {
  return Boolean(features[feature]);
}

function tabEnabled(tabs: string[], tab: DashboardTabId, features: Record<string, boolean>, plan: PlanDefinition) {
  if (tabs.includes(tab)) return true;
  if (Object.keys(features).length) return featureEnabled(features, TAB_FEATURES[tab]);
  return hasTab(plan, tab);
}

function routeEnabled(routes: string[], route: RouteKey, plan: PlanDefinition) {
  if (routes.includes(route)) return true;
  if (routes.length) return false;
  return hasRoute(plan, route);
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [backendSession, setBackendSession] = useState<BackendSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [upgradeMessage, setUpgradeMessage] = useState("");

  const refreshSubscription = useCallback(async (options: RefreshSubscriptionOptions = {}) => {
    if (!user) {
      setBackendSession(null);
      setError("");
      setUpgradeMessage("");
      return;
    }

    setLoading(true);
    try {
      const response = await authorizedFetch("/api/me");
      const session = await readApiJson<BackendSession>(response);
      setBackendSession(session);
      setError("");
      if (options.notify && isPlanId(session.subscription.plan_id) && session.subscription.plan_id !== "free") {
        setUpgradeMessage(`${PLAN_DEFINITIONS[session.subscription.plan_id].name} plan is active.`);
      }
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Subscription service is unavailable.";
      setBackendSession(null);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refreshSubscription();
  }, [refreshSubscription]);

  const value = useMemo<PermissionContextValue>(() => {
    const backendPlanId = backendSession?.subscription.plan_id;
    const planId: PlanId = isPlanId(backendPlanId) ? backendPlanId : "free";
    const plan = PLAN_DEFINITIONS[planId];
    const trial = normalizeTrial(backendSession?.subscription.trial);
    const sessionLoading = loading || Boolean(user && !backendSession && !error);
    const features = backendSession?.permissions.features || fallbackFeatures(plan);
    const backendTabs = backendSession?.permissions.tabs || [];
    const backendRoutes = backendSession?.permissions.routes || [];
    const availableTabs = DASHBOARD_TAB_ORDER.filter((tab) => tabEnabled(backendTabs, tab, features, plan));
    const lockedTabs = DASHBOARD_TAB_ORDER.filter((tab) => !availableTabs.includes(tab));
    const nextPlanId = nextPlanAfter(plan.id);

    return {
      subscription: {
        source: backendSession ? "backend" : "unavailable",
        planId: plan.id,
        plan,
        creditsRemaining: backendSession?.subscription.credits_remaining ?? plan.creditLimit,
        storageKey: null,
        upgradedAt: backendSession?.subscription.start_date || null,
        loading: sessionLoading,
        error,
        planType: backendSession?.subscription.plan_type || (plan.id === "free" ? "free" : "premium"),
        subscriptionStatus: backendSession?.subscription.subscription_status || "active",
        trial,
        trialExpired: Boolean(backendSession?.subscription.trial_expired),
        effectivePlanId: backendSession?.subscription.effective_plan_id || plan.id,
        accessLevel: backendSession?.access_level || backendSession?.subscription.access_level || (plan.id === "free" ? "free" : "paid"),
      },
      plans: PLAN_DEFINITIONS,
      availableTabs,
      lockedTabs,
      canUseFeature: (feature) => (backendSession ? featureEnabled(features, feature) : hasFeature(PLAN_DEFINITIONS.free, feature)),
      canAccessTab: (tab) => tabEnabled(backendTabs, tab, features, backendSession ? plan : PLAN_DEFINITIONS.free),
      canAccessRoute: (route) => routeEnabled(backendRoutes, route, backendSession ? plan : PLAN_DEFINITIONS.free),
      requiredFeatureForTab: (tab) => TAB_FEATURES[tab],
      recommendedPlanForFeature: (feature) => PLAN_DEFINITIONS[getRecommendedPlanIdForFeature(feature)],
      recommendedPlanForTab: (tab) => PLAN_DEFINITIONS[getRecommendedPlanIdForTab(tab)],
      nextUpgradePlan: nextPlanId ? PLAN_DEFINITIONS[nextPlanId] : null,
      refreshSubscription,
      upgradeMessage,
      clearUpgradeMessage: () => setUpgradeMessage(""),
    };
  }, [backendSession, error, loading, refreshSubscription, upgradeMessage, user]);

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (!context) throw new Error("usePermissions must be used inside SubscriptionProvider.");
  return context;
}
