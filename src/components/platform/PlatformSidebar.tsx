import React, { useMemo, useState } from "react";
import { ChevronRight, Lock } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import Logo from "../Logo.tsx";
import UserAvatar from "./UserAvatar";
import type { PlatformNavSection, PlatformServiceItem, PlatformServiceId } from "./navigation";

interface PlatformSidebarProps {
  sections: PlatformNavSection[];
  activeServiceId: PlatformServiceId;
  collapsed: boolean;
  canAccessItem: (item: PlatformServiceItem) => boolean;
  recommendedPlanForItem: (item: PlatformServiceItem) => string;
  onSelect: (item: PlatformServiceItem) => void;
  onToggleCollapsed: () => void;
  displayName?: string;
  userEmail?: string;
  avatarUrl?: string;
  onAccountClick?: () => void;
}

export default function PlatformSidebar({
  sections,
  activeServiceId,
  collapsed,
  canAccessItem,
  recommendedPlanForItem,
  onSelect,
  onToggleCollapsed,
  displayName = "Adviso User",
  userEmail = "",
  avatarUrl = "",
  onAccountClick,
}: PlatformSidebarProps) {
  const collapsibleLabels = useMemo(
    () => new Set(sections.filter((section) => section.items.length > 1).map((section) => section.label)),
    [sections],
  );
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (label: string) => {
    if (!collapsibleLabels.has(label)) return;
    setCollapsedSections((current) => ({ ...current, [label]: !current[label] }));
  };

  return (
    <aside className={`ap-sidebar hidden h-full min-h-0 shrink-0 border-r transition-[width] duration-300 ease-out lg:flex lg:flex-col ${collapsed ? "w-[86px]" : "w-[280px]"}`}>
      <div className={`border-b py-5 ${collapsed ? "px-4" : "px-6"}`} style={{ borderColor: "var(--ap-border)" }}>
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-3`}>
          <Logo size={collapsed ? "md" : "lg"} hideText={collapsed} className="text-[var(--ap-text)]" />
          {!collapsed && (
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="ap-sidebar-collapse-btn"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="ap-sidebar-collapse-btn mx-auto mt-3"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className={`min-h-0 flex-1 overflow-y-auto scroll-thin ${collapsed ? "p-3" : "p-4 pr-3"}`} aria-label="Platform navigation">
        {sections.map((section) => {
          const isHomeSection = section.label === "Home";
          const collapsible = !collapsed && section.items.length > 1;
          const sectionCollapsed = collapsible && collapsedSections[section.label];
          const activeInside = section.items.some((item) => item.id === activeServiceId);

          return (
            <div key={section.label} className={collapsed ? "mb-2" : isHomeSection ? "mb-3" : "mb-4"}>
              {!collapsed && collapsible ? (
                <button
                  type="button"
                  onClick={() => toggleSection(section.label)}
                  className={`ap-sidebar-section-toggle w-full ${activeInside ? "ap-sidebar-section-active" : ""}`}
                  aria-expanded={!sectionCollapsed}
                >
                  <span className="truncate">{section.label}</span>
                  <ChevronRight className={`h-3.5 w-3.5 transition-transform ${sectionCollapsed ? "" : "rotate-90"}`} />
                </button>
              ) : !collapsed && !isHomeSection ? (
                <div className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.16em] ap-muted">
                  {section.label}
                </div>
              ) : null}

              <AnimatePresence initial={false}>
                {!sectionCollapsed && (
                  <motion.div
                    initial={collapsible ? { height: 0, opacity: 0 } : false}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const locked = !canAccessItem(item);
                        const active = activeServiceId === item.id;
                        const badge = locked ? recommendedPlanForItem(item) : item.status === "planned" ? "Soon" : "";

                        return (
                          <button
                            key={item.id}
                            onClick={() => onSelect(item)}
                            className={`ap-nav-item w-full ${collapsed ? "ap-nav-item-collapsed justify-center" : ""} ${!collapsed && item.id === "home" ? "ap-nav-home-icon" : ""} ${active ? "ap-nav-item-active" : ""} ${locked && !active ? "opacity-80" : ""}`}
                            title={locked ? `${item.label} requires ${badge}` : item.description}
                            aria-label={item.label}
                          >
                            <span className="ap-nav-icon">{item.icon}</span>
                            {!collapsed && item.id !== "home" && <span className="truncate">{item.label}</span>}
                            {!collapsed && badge && (
                              <span className={`ap-nav-badge ml-auto ${locked ? "ap-nav-badge-premium" : ""}`}>
                                {locked && <Lock className="h-3 w-3" />}
                                {badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      <div className={`border-t ${collapsed ? "p-3" : "p-4"}`} style={{ borderColor: "var(--ap-border)" }}>
        <button
          type="button"
          onClick={onAccountClick}
          className={`ap-sidebar-account w-full ${collapsed ? "justify-center p-2" : ""}`}
          aria-label="Open account settings"
          title="Account settings"
        >
          <UserAvatar name={displayName} email={userEmail} src={avatarUrl} size="md" />
          {!collapsed && (
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-sm font-black">{displayName}</span>
              <span className="block truncate text-[11px] font-bold ap-muted">{userEmail || "Account settings"}</span>
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}
