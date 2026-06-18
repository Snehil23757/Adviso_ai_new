import type { PlanId } from "./permissions";

export type PaidPlanId = Exclude<PlanId, "free">;

export interface CheckoutPlan {
  id: PaidPlanId;
  name: string;
  price: string;
  amountPaise: number;
}

export const CHECKOUT_PLANS: Record<PaidPlanId, CheckoutPlan> = {
  go: {
    id: "go",
    name: "GO",
    price: "INR 79",
    amountPaise: 7900,
  },
  pro: {
    id: "pro",
    name: "PRO",
    price: "INR 399",
    amountPaise: 39900,
  },
  enterprise: {
    id: "enterprise",
    name: "ENTERPRISE",
    price: "INR 3,999",
    amountPaise: 399900,
  },
};

export function checkoutPlanForId(planId: PlanId) {
  if (planId === "free") return null;
  return CHECKOUT_PLANS[planId];
}

export function checkoutPlanForName(planName: string, price?: string, amountPaise?: number) {
  const normalized = planName.toLowerCase();
  if (normalized !== "go" && normalized !== "pro" && normalized !== "enterprise") return null;
  const basePlan = CHECKOUT_PLANS[normalized];
  if (price && amountPaise && amountPaise >= 100) {
    return { ...basePlan, price, amountPaise };
  }
  return basePlan;
}
