import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { GlobalRoadmapsClient } from "@/components/roadmaps";
import { projects as canonicalProjects } from "@/data/projects";
import {
  aggregateGlobalRoadmapData,
  computeDaysUntilDue,
  isMilestoneOverdue,
} from "@/lib/roadmap-utils";
import type { ProjectMilestone, ProjectRoadmapItem, ProjectTask } from "@/types/project";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/kanban",
}));

const REF_DATE = new Date("2026-11-25T12:00:00.000Z");

const sampleMilestones: ProjectMilestone[] = [
  {
    id: "ms-1",
    projectId: canonicalProjects[0].id,
    title: "Complete Auth Migration",
    dueDate: "2026-11-20", // 5 days overdue relative to 2026-11-25
    completed: false,
    completedAt: null,
  },
  {
    id: "ms-2",
    projectId: canonicalProjects[0].id,
    title: "Release v1.0",
    dueDate: "2026-12-02", // 7 days ahead -> Next 14 days
    completed: false,
    completedAt: null,
  },
  {
    id: "ms-3",
    projectId: canonicalProjects[1].id,
    title: "Initial Schema",
    dueDate: "2026-11-10",
    completed: true,
    completedAt: "2026-11-09T10:00:00.000Z",
  },
];

const sampleTasks: ProjectTask[] = [
  {
    id: "task-1",
    projectId: canonicalProjects[0].id,
    userId: "user-1",
    title: "Audit API endpoints",
    completed: true,
    phase: "Technical Audit",
    order: 1,
    createdAt: "2026-11-01T00:00:00Z",
    completedAt: "2026-11-02T00:00:00Z",
  },
  {
    id: "task-2",
    projectId: canonicalProjects[0].id,
    userId: "user-1",
    title: "Add unit test suite",
    completed: false,
    phase: "Quality Assurance",
    order: 2,
    createdAt: "2026-11-03T00:00:00Z",
    completedAt: null,
  },
];

const sampleRoadmaps: ProjectRoadmapItem[] = [
  {
    id: "rm-1",
    projectId: canonicalProjects[0].id,
    phase: 1,
    title: "Acquisition",
    description: "Cloned",
    status: "completed",
    order: 1,
  },
];

describe("Milestone 6 — Global Roadmaps Aggregation & UI", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Pure Roadmap Aggregation & Overdue Logic", () => {
    it("accurately computes UTC due day deltas and overdue status", () => {
      expect(computeDaysUntilDue("2026-11-25", REF_DATE)).toBe(0);
      expect(computeDaysUntilDue("2026-11-20", REF_DATE)).toBe(-5);
      expect(computeDaysUntilDue("2026-12-05", REF_DATE)).toBe(10);

      // Due today is NOT overdue
      expect(
        isMilestoneOverdue({ completed: false, dueDate: "2026-11-25" }, REF_DATE),
      ).toBe(false);
      // Due yesterday is overdue
      expect(
        isMilestoneOverdue({ completed: false, dueDate: "2026-11-24" }, REF_DATE),
      ).toBe(true);
      // Completed past due is NOT overdue
      expect(
        isMilestoneOverdue({ completed: true, dueDate: "2026-11-01" }, REF_DATE),
      ).toBe(false);
      // Undated is NOT overdue
      expect(isMilestoneOverdue({ completed: false, dueDate: null }, REF_DATE)).toBe(
        false,
      );
    });

    it("aggregates across projects without duplicating records or fabricating missing data", () => {
      // Pass duplicate milestone ID intentionally to confirm deduplication
      const result = aggregateGlobalRoadmapData({
        projects: canonicalProjects.slice(0, 5),
        milestones: [...sampleMilestones, sampleMilestones[0]],
        tasks: sampleTasks,
        persistedRoadmaps: sampleRoadmaps,
        referenceDate: REF_DATE,
      });

      expect(result.summary.totalProjects).toBe(5);
      expect(result.summary.projectsWithData).toBe(2); // project 1 & project 2
      expect(result.summary.projectsWithoutData).toBe(3);
      expect(result.summary.totalMilestones).toBe(3); // deduplicated!
      expect(result.summary.completedMilestones).toBe(1);
      expect(result.summary.overdueMilestones).toBe(1);
      expect(result.summary.totalTasks).toBe(2);
      expect(result.summary.completedTasks).toBe(1);
      expect(result.summary.totalPersistedPhases).toBe(1);

      const bundle0 = result.bundles[0];
      expect(bundle0.hasPersistedRoadmap).toBe(true);
      expect(bundle0.milestones[0].isOverdue).toBe(true);
      expect(bundle0.milestones[1].dueBucket).toBe("next-14-days");

      const bundle2 = result.bundles[2];
      expect(bundle2.hasAnyRoadmapData).toBe(false);
      expect(bundle2.persistedPhases).toHaveLength(0);
    });

    it("enforces user isolation in JSON store getGlobalRoadmapData", async () => {
      vi.resetModules();
      vi.stubEnv("DATABASE_URL", "");
      const devspaceStore = await import("@/services/devspace-store");

      const userAData = await devspaceStore.getGlobalRoadmapData("user-isolated-alpha");
      const userBData = await devspaceStore.getGlobalRoadmapData("user-isolated-beta");

      expect(userAData.tasks).toHaveLength(0);
      expect(userAData.persistedRoadmaps).toHaveLength(0);
      expect(userBData.tasks).toHaveLength(0);
    });
  });

  describe("GlobalRoadmapsClient UI", () => {
    it("renders timeline view with Today marker, milestones, and overdue alert", () => {
      render(
        <GlobalRoadmapsClient
          initialProjects={canonicalProjects.slice(0, 5)}
          initialMilestones={sampleMilestones}
          initialTasks={sampleTasks}
          initialPersistedRoadmaps={sampleRoadmaps}
        />,
      );

      expect(screen.getByRole("heading", { name: "Roadmaps" })).toBeInTheDocument();
      expect(screen.getByText("Today")).toBeInTheDocument();
      expect(screen.getAllByText(/Complete Auth Migration/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Overdue/i).length).toBeGreaterThan(0);
    });

    it("switches to List view grouped by project and by due date", () => {
      render(
        <GlobalRoadmapsClient
          initialProjects={canonicalProjects.slice(0, 5)}
          initialMilestones={sampleMilestones}
          initialTasks={sampleTasks}
          initialPersistedRoadmaps={sampleRoadmaps}
        />,
      );

      fireEvent.click(screen.getByRole("radio", { name: /List/i }));
      expect(screen.getByText("Audit API endpoints")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("radio", { name: /By due date/i }));
      expect(screen.getByText("Completed")).toBeInTheDocument();
    });

    it("toggles milestone completion via /api/projects/[slug]/milestones", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          milestone: { ...sampleMilestones[1], completed: true },
        }),
      });
      vi.stubGlobal("fetch", fetchMock);

      render(
        <GlobalRoadmapsClient
          initialProjects={canonicalProjects.slice(0, 5)}
          initialMilestones={sampleMilestones}
          initialTasks={sampleTasks}
          initialPersistedRoadmaps={sampleRoadmaps}
        />,
      );

      fireEvent.click(screen.getByRole("radio", { name: /List/i }));
      const msButton = screen.getByRole("button", { name: /Release v1\.0/i });
      fireEvent.click(msButton);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          `/api/projects/${canonicalProjects[0].slug}/milestones`,
          expect.objectContaining({
            method: "PATCH",
          }),
        );
      });
    });

    it("renders explicit empty state when no persisted roadmap data exists", () => {
      render(
        <GlobalRoadmapsClient
          initialProjects={canonicalProjects.slice(0, 5)}
          initialMilestones={[]}
          initialTasks={[]}
          initialPersistedRoadmaps={[]}
        />,
      );

      expect(
        screen.getByText("No persisted roadmaps or milestones yet."),
      ).toBeInTheDocument();
    });
  });
});
