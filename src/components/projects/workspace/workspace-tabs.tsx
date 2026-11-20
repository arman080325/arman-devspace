"use client";

import { useId, useRef, type ReactNode } from "react";
import {
  LayoutDashboard,
  Layers,
  Milestone,
  GitBranch,
  Rocket,
  Activity,
  FileCode2,
} from "lucide-react";
import { cx } from "@/components/redesign/ui";

export type WorkspaceTabId =
  "overview" | "roadmap" | "milestones" | "github" | "deployments" | "activity" | "docs";

export interface WorkspaceTabItem {
  id: WorkspaceTabId;
  label: string;
  icon: ReactNode;
  count?: number | null;
}

export function WorkspaceTabs({
  activeTab,
  onTabChange,
  milestonesCount,
  deploymentsCount,
  notesCount,
}: {
  activeTab: WorkspaceTabId;
  onTabChange: (tab: WorkspaceTabId) => void;
  milestonesCount?: number;
  deploymentsCount?: number;
  notesCount?: number;
}) {
  const tabsListId = useId();
  const tabsRef = useRef<Record<string, HTMLButtonElement | null>>({});

  const tabs: WorkspaceTabItem[] = [
    {
      id: "overview",
      label: "Overview",
      icon: <LayoutDashboard size={14} strokeWidth={1.5} />,
    },
    {
      id: "roadmap",
      label: "Roadmap",
      icon: <Layers size={14} strokeWidth={1.5} />,
    },
    {
      id: "milestones",
      label: "Milestones",
      icon: <Milestone size={14} strokeWidth={1.5} />,
      count: milestonesCount,
    },
    {
      id: "github",
      label: "GitHub Intelligence",
      icon: <GitBranch size={14} strokeWidth={1.5} />,
    },
    {
      id: "deployments",
      label: "Deployments & CI/CD",
      icon: <Rocket size={14} strokeWidth={1.5} />,
      count: deploymentsCount,
    },
    {
      id: "activity",
      label: "Activity",
      icon: <Activity size={14} strokeWidth={1.5} />,
    },
    {
      id: "docs",
      label: "Docs & Screenshots",
      icon: <FileCode2 size={14} strokeWidth={1.5} />,
      count: notesCount,
    },
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const currentIndex = tabs.findIndex((t) => t.id === activeTab);
    let nextIndex = -1;

    if (e.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
    else if (e.key === "ArrowLeft")
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") nextIndex = 0;
    else if (e.key === "End") nextIndex = tabs.length - 1;

    if (nextIndex >= 0) {
      e.preventDefault();
      const nextTab = tabs[nextIndex].id;
      onTabChange(nextTab);
      tabsRef.current[nextTab]?.focus();
    }
  };

  return (
    <nav
      aria-label="Workspace tabs"
      className="sticky top-12 z-20 mb-6 border-b border-line bg-base"
    >
      <div
        role="tablist"
        id={tabsListId}
        aria-orientation="horizontal"
        onKeyDown={handleKeyDown}
        className="scrollbar-none flex max-w-full gap-1 overflow-x-auto px-1 sm:px-2"
        tabIndex={0}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabsRef.current[tab.id] = el;
              }}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onTabChange(tab.id)}
              className={cx(
                "relative -mb-px inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap px-3 text-xs font-medium transition-colors select-none",
                isActive
                  ? "text-fg font-semibold"
                  : "text-fg2 hover:text-fg hover:bg-elevated/40",
              )}
            >
              <span className={isActive ? "text-sodium-text" : "text-fg3"}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {tab.count != null && tab.count > 0 && (
                <span className="font-mono rounded-cell bg-inset px-1 text-[10px] text-fg3">
                  {tab.count}
                </span>
              )}
              {/* Active Sodium indicator */}
              <span
                aria-hidden
                className={cx(
                  "absolute inset-x-2 bottom-0 h-0.5 rounded-t-full bg-sodium transition-opacity duration-150",
                  isActive ? "opacity-100" : "opacity-0",
                )}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
