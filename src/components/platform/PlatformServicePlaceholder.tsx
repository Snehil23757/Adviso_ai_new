import React from "react";
import { ArrowRight, CheckCircle2, Database, Lock, Sparkles } from "lucide-react";
import { motion } from "motion/react";

import type { PlatformServiceItem } from "./navigation";

interface PlatformServicePlaceholderProps {
  service: PlatformServiceItem;
  locked: boolean;
  currentPlanName: string;
  recommendedPlanName: string;
  onUpgrade: () => void;
}

export default function PlatformServicePlaceholder({
  service,
  locked,
  currentPlanName,
  recommendedPlanName,
  onUpgrade,
}: PlatformServicePlaceholderProps) {
  const planned = service.backend === "planned";

  return (
    <motion.section
      className="ap-card overflow-hidden rounded-2xl border"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#145DFF]" style={{ borderColor: "var(--ap-border)" }}>
            {locked ? <Lock className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
            {locked ? "Upgrade required" : planned ? "Service scaffold" : "Connected workspace"}
          </div>

          <h2 className="mt-4 text-3xl font-black tracking-tight text-[var(--ap-text)]">{service.label}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 ap-muted">{service.description}</p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              { title: "Permission model", detail: service.feature ? `${service.feature} gate` : "Workspace level access" },
              { title: "Backend state", detail: service.backend === "connected" ? "Connected to active APIs" : "Endpoint planned" },
              { title: "Rollout path", detail: service.requiredPlan ? `${service.requiredPlan.toUpperCase()} and above` : "Base workspace" },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border bg-white p-4" style={{ borderColor: "var(--ap-border)" }}>
                <div className="text-xs font-black text-[var(--ap-text)]">{item.title}</div>
                <div className="mt-1 text-xs leading-5 ap-muted">{item.detail}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-gradient-to-br from-blue-50 to-white p-5" style={{ borderColor: "var(--ap-border)" }}>
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-[#145DFF] shadow-sm">
            {locked ? <Lock className="h-7 w-7" /> : <Database className="h-7 w-7" />}
          </div>

          <h3 className="mt-5 text-lg font-black">
            {locked ? `${recommendedPlanName} unlocks this module` : planned ? "Ready for the next backend slice" : "Live module"}
          </h3>
          <p className="mt-2 text-sm leading-6 ap-muted">
            {locked
              ? `Your current ${currentPlanName} plan can see this workspace, but server-side permissions will block access until upgrade.`
              : planned
                ? "The navigation, permission gate, and workspace shell are in place. Add database tables and API endpoints when this service is ready."
                : "This module is connected to the active platform workflow and respects backend-driven permissions."}
          </p>

          {locked ? (
            <button onClick={onUpgrade} className="ap-btn-primary mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black">
              View plans
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <div className="mt-5 space-y-3">
              {["Sidebar route is active", "Permission checks are centralized", "Placeholder can be replaced by a real module"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm font-bold text-[var(--ap-text)]">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
