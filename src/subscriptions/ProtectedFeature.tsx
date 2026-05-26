import React from "react";

import { usePermissions } from "./SubscriptionProvider";
import { PLAN_UPGRADE_PATH, type FeatureKey, type PlanId, type RouteKey } from "./permissions";

interface UpgradeRequiredProps {
  title?: string;
  description?: string;
  requiredLabel?: string;
  targetPlanId?: PlanId;
  onUpgradeRequested?: (planId: PlanId) => void;
}

export function UpgradeRequired({
  title = "Upgrade required",
  description = "Your current plan does not include this workspace capability.",
  requiredLabel,
  targetPlanId,
  onUpgradeRequested,
}: UpgradeRequiredProps) {
  const { plans, subscription } = usePermissions();
  const currentPlanIndex = PLAN_UPGRADE_PATH.indexOf(subscription.planId);
  const upgradePlans = (targetPlanId ? [plans[targetPlanId]] : [plans.go, plans.pro, plans.enterprise]).filter(
    (plan) => PLAN_UPGRADE_PATH.indexOf(plan.id) > currentPlanIndex,
  );

  return (
    <div className="ap-card border rounded-xl p-8 text-center min-h-[360px] flex items-center justify-center">
      <div className="max-w-xl">
        <div className="mx-auto mb-4 inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]" style={{ borderColor: "var(--ap-border)", color: "var(--ap-muted)" }}>
          {subscription.plan.name} plan
        </div>
        <h2 className="text-2xl font-black">{title}</h2>
        <p className="ap-muted mt-3 text-sm leading-6">{description}</p>
        {requiredLabel && (
          <div className="mt-5 inline-flex rounded-lg px-3 py-2 text-xs font-bold" style={{ background: "var(--ap-accent-soft)", color: "var(--ap-accent)" }}>
            Required: {requiredLabel}
          </div>
        )}
        {upgradePlans.length > 0 && (
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {upgradePlans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => onUpgradeRequested?.(plan.id)}
                disabled={!onUpgradeRequested}
                className="ap-btn-primary rounded-xl px-4 py-3 text-xs font-black"
              >
                {plan.upgradeCta}
              </button>
            ))}
          </div>
        )}
        <p className="ap-muted mt-4 text-xs">
          Checkout opens a secure payment flow. The plan unlocks only after successful payment verification.
        </p>
      </div>
    </div>
  );
}

export function ProtectedFeature({
  feature,
  children,
  fallback,
}: {
  feature: FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { canUseFeature } = usePermissions();
  if (!canUseFeature(feature)) {
    return fallback || <UpgradeRequired requiredLabel={feature} />;
  }
  return <>{children}</>;
}

export function ProtectedRoute({
  route,
  children,
  fallback,
}: {
  route: RouteKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { canAccessRoute } = usePermissions();
  if (!canAccessRoute(route)) {
    return fallback || <UpgradeRequired requiredLabel={route} />;
  }
  return <>{children}</>;
}
