import React from "react";
import { ArrowRight, HelpCircle, Lock } from "lucide-react";

import Logo from "../Logo.tsx";
import type { PlatformNavSection, PlatformServiceItem, PlatformServiceId } from "./navigation";

interface PlatformSidebarProps {
  sections: PlatformNavSection[];
  activeServiceId: PlatformServiceId;
  canAccessItem: (item: PlatformServiceItem) => boolean;
  recommendedPlanForItem: (item: PlatformServiceItem) => string;
  onSelect: (item: PlatformServiceItem) => void;
}

export default function PlatformSidebar({
  sections,
  activeServiceId,
  canAccessItem,
  recommendedPlanForItem,
  onSelect,
}: PlatformSidebarProps) {
  return (
    <aside className="ap-sidebar hidden w-[280px] shrink-0 border-r lg:flex lg:flex-col">
      <div className="border-b px-6 py-5" style={{ borderColor: "var(--ap-border)" }}>
        <Logo size="lg" className="text-[var(--ap-text)]" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 scroll-thin">
        {sections.map((section) => (
          <div key={section.label} className="mb-5">
            <div className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.16em] ap-muted">
              {section.label}
            </div>
            <div className="space-y-1">
              {section.items.map((item) => {
                const locked = !canAccessItem(item);
                const active = activeServiceId === item.id;
                const badge = locked ? recommendedPlanForItem(item) : item.status === "planned" ? "Soon" : "";

                return (
                  <button
                    key={item.id}
                    onClick={() => onSelect(item)}
                    className={`ap-nav-item w-full ${active ? "ap-nav-item-active" : ""} ${locked && !active ? "opacity-80" : ""}`}
                    title={locked ? `${item.label} requires ${badge}` : item.description}
                  >
                    <span className="ap-nav-icon">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                    {badge && (
                      <span className={`ap-nav-badge ml-auto ${locked ? "ap-nav-badge-premium" : ""}`}>
                        {locked && <Lock className="h-3 w-3" />}
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4">
        <div className="ap-help-card rounded-2xl border p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/70 text-[#145DFF] shadow-sm">
              <HelpCircle className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-black">Get help</div>
              <div className="text-xs ap-muted">Workspace guidance</div>
            </div>
            <ArrowRight className="ml-auto h-4 w-4 ap-muted" />
          </div>
        </div>
      </div>
    </aside>
  );
}
