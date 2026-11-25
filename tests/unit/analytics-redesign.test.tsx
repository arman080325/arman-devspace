import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { AnalyticsDashboard } from "@/components/analytics";
import { projects as canonicalProjects } from "@/data/projects";
import { computeEngineeringAnalytics } from "@/lib/analytics-utils";
import type {
  DeploymentRecord,
  Project,
  ProjectActivityItem,
  ProjectMilestone,
  ProjectTask,
  WorkspaceStats,
} from "@/types/project";

const baseStats: WorkspaceStats = {
  totalProjects: 100,
  definedProjects: 73,
  placeholderProjects: 27,
  completedProjects: 1,
  inDevelopmentProjects: 1,
  activeProjects: 1,
  awaitingProjects: 98,
  technologiesExplored: 2,
  bookmarkedCount: 1,
  notesCount: 3,
  tasksCompleted: 1,
  tasksTotal: 2,
  overallCompletion: 1,
  streakDays: 2,
  difficultyBreakdown: {
    beginner: { total: 30, completed: 1, active: 0 },
    intermediate: { total: 20, completed: 0, active: 1 },
    advanced: { total: 50, completed: 0, active: 0 },
  },
  statusCounts: {
    awaiting: 98,
    backlog: 0,
    cloned: 0,
    analyzing: 0,
    planning: 0,
    "in-development": 1,
    testing: 0,
    completed: 1,
  },
  technologyDistribution: [
    { name: "React", count: 40, completedCount: 1 },
    { name: "TypeScript", count: 35, completedCount: 0 },
  ],
  weeklyActivity: [
    { day: "Mon", date: "2026-11-19", count: 0 },
    { day: "Tue", date: "2026-11-20", count: 0 },
    { day: "Wed", date: "2026-11-21", count: 0 },
    { day: "Thu", date: "2026-11-22", count: 0 },
    { day: "Fri", date: "2026-11-23", count: 2 },
    { day: "Sat", date: "2026-11-24", count: 1 },
    { day: "Sun", date: "2026-11-25", count: 0 },
  ],
};

describe("Milestone 6 — Engineering Analytics Computation & UI", () => {
  it("reconciles every distribution total with source projects and keeps unknown separate from failed", () => {
    const sampleProjects: Project[] = canonicalProjects.map((p, idx) => {
      if (idx === 0) {
        return {
          ...p,
          status: "completed",
          verificationStatus: "verified",
          deploymentUrl: "https://proj1.vercel.app",
          repositoryMetadata: {
            projectId: p.id,
            owner: "arman",
            repoName: "p1",
            defaultBranch: "main",
            description: null,
            primaryLanguage: "TypeScript",
            stars: 10,
            forks: 2,
            openIssues: 1,
            lastUpdated: "2026-11-24T00:00:00Z",
            isArchived: false,
            hasReadme: true,
            license: "MIT",
            topics: [],
            verifiedAt: "2026-11-24T00:00:00Z",
            health: {
              status: "healthy",
              availability: "reachable",
              freshness: "active",
              daysSincePush: 1,
              signals: [],
            },
            latestWorkflowRun: {
              id: 101,
              name: "CI",
              status: "completed",
              conclusion: "success",
              branch: "main",
              commitSha: "abc1234",
              commitShortSha: "abc1234",
              url: "https://github.com/arman/p1/actions/runs/101",
              createdAt: "2026-11-24T00:00:00Z",
              updatedAt: "2026-11-24T00:00:00Z",
              event: "push",
              actor: "arman",
            },
          },
        };
      }
      if (idx === 30) {
        return {
          ...p,
          status: "in-development",
          verificationStatus: "needs-review",
          repositoryMetadata: {
            projectId: p.id,
            owner: "arman",
            repoName: "p31",
            defaultBranch: "main",
            description: null,
            primaryLanguage: "Python",
            stars: 5,
            forks: 0,
            openIssues: 2,
            lastUpdated: "2026-11-20T00:00:00Z",
            isArchived: false,
            hasReadme: true,
            license: null,
            topics: [],
            verifiedAt: "2026-11-20T00:00:00Z",
            health: {
              status: "needs-review",
              availability: "reachable",
              freshness: "moderate",
              daysSincePush: 5,
              signals: [],
            },
            latestWorkflowRun: null, // synced repo without CI run!
          },
        };
      }
      return { ...p, repositoryMetadata: null };
    });

    const milestones: ProjectMilestone[] = [
      {
        id: "m1",
        projectId: sampleProjects[0].id,
        title: "Ship v1",
        dueDate: "2026-11-20",
        completed: true,
        completedAt: "2026-11-19T00:00:00Z",
      },
      {
        id: "m2",
        projectId: sampleProjects[30].id,
        title: "Fix tests",
        dueDate: "2026-11-20",
        completed: false,
        completedAt: null,
      },
    ];

    const tasks: ProjectTask[] = [
      {
        id: "t1",
        projectId: sampleProjects[0].id,
        userId: "u1",
        title: "Task 1",
        completed: true,
        phase: "Build",
        order: 1,
        createdAt: "2026-11-20T00:00:00Z",
        completedAt: "2026-11-21T00:00:00Z",
      },
      {
        id: "t2",
        projectId: sampleProjects[0].id,
        userId: "u1",
        title: "Task 2",
        completed: false,
        phase: "Test",
        order: 2,
        createdAt: "2026-11-20T00:00:00Z",
        completedAt: null,
      },
    ];

    const deployments: DeploymentRecord[] = [
      {
        id: "d1",
        projectId: sampleProjects[0].id,
        environment: "production",
        url: "https://proj1.vercel.app",
        provider: "Vercel",
        status: "active",
        deployedAt: "2026-11-24T00:00:00Z",
        notes: null,
      },
    ];

    const activities: ProjectActivityItem[] = [
      {
        id: "a1",
        projectId: sampleProjects[0].id,
        userId: "u1",
        action: "progress.updated",
        summary: "Shipped",
        createdAt: "2026-11-24T00:00:00Z",
      },
    ];

    const snap = computeEngineeringAnalytics({
      projects: sampleProjects,
      stats: baseStats,
      milestones,
      tasks,
      deployments,
      activities,
      referenceDate: new Date("2026-11-25T12:00:00Z"),
    });

    // Strict reconciliation invariants
    expect(snap.catalogue.totalProjects).toBe(100);
    expect(snap.lifecyclePhases.reduce((s, x) => s + x.count, 0)).toBe(100);
    expect(snap.pipelineStatuses.reduce((s, x) => s + x.count, 0)).toBe(100);
    expect(snap.categories.reduce((s, x) => s + x.total, 0)).toBe(100);
    expect(snap.difficulties.reduce((s, x) => s + x.total, 0)).toBe(100);
    expect(snap.verificationBreakdown.reduce((s, x) => s + x.count, 0)).toBe(100);

    // Health reconciliation & missing != failed invariant
    expect(snap.repositoryHealth.syncedCount).toBe(2);
    expect(snap.repositoryHealth.unsyncedCount).toBe(98);
    expect(snap.repositoryHealth.syncCoveragePct).toBe(2);
    expect(snap.repositoryHealth.good).toBe(1);
    expect(snap.repositoryHealth.fair).toBe(1);
    expect(snap.repositoryHealth.poor).toBe(0); // NOT counting unsynced as poor!
    expect(snap.repositoryHealth.unknown).toBe(98);

    // CI reconciliation & missing != failing invariant
    expect(snap.ciWorkflows.passing).toBe(1);
    expect(snap.ciWorkflows.failing).toBe(0);
    expect(snap.ciWorkflows.unknownOrNotSynced).toBe(99);

    // Milestones & tasks
    expect(snap.execution.milestonesTotal).toBe(2);
    expect(snap.execution.milestonesCompleted).toBe(1);
    expect(snap.execution.milestonesOverdue).toBe(1);
    expect(snap.execution.milestoneCompletionRate).toBe(50);
    expect(snap.execution.taskCompletionRate).toBe(50);

    // Activity
    expect(snap.activity.weeklyTotal).toBe(3);
  });

  it("handles completely empty datasets without NaN or fabricated numbers", () => {
    const emptyStats: WorkspaceStats = {
      ...baseStats,
      totalProjects: 0,
      definedProjects: 0,
      placeholderProjects: 0,
      completedProjects: 0,
      inDevelopmentProjects: 0,
      activeProjects: 0,
      awaitingProjects: 0,
      technologiesExplored: 0,
      bookmarkedCount: 0,
      notesCount: 0,
      tasksCompleted: 0,
      tasksTotal: 0,
      overallCompletion: 0,
      streakDays: 0,
      technologyDistribution: [],
      weeklyActivity: [],
    };

    const snap = computeEngineeringAnalytics({
      projects: [],
      stats: emptyStats,
      milestones: [],
      tasks: [],
      deployments: [],
      activities: [],
    });

    expect(snap.catalogue.totalProjects).toBe(0);
    expect(snap.repositoryHealth.syncCoveragePct).toBe(0);
    expect(snap.execution.milestoneCompletionRate).toBeNull();
    expect(snap.execution.taskCompletionRate).toBeNull();

    render(<AnalyticsDashboard snapshot={snap} />);
    expect(
      screen.getByText("No project data available for analytics."),
    ).toBeInTheDocument();
  });

  it("renders accessible charts, figures, and source attributions in AnalyticsDashboard", () => {
    const snap = computeEngineeringAnalytics({
      projects: canonicalProjects,
      stats: baseStats,
      milestones: [],
      tasks: [],
      deployments: [],
      activities: [],
    });

    render(<AnalyticsDashboard snapshot={snap} />);

    expect(screen.getByRole("heading", { name: "Analytics" })).toBeInTheDocument();
    expect(screen.getByText("Projects by Lifecycle Phase")).toBeInTheDocument();
    expect(screen.getByText("Difficulty Tier Distribution")).toBeInTheDocument();
    expect(screen.getByText("GitHub Health & CI Snapshots")).toBeInTheDocument();
    expect(screen.getByText("7-Day Activity Volume")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /Lifecycle phase bar across 100 projects/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /7-day persisted activity bar chart/i }),
    ).toBeInTheDocument();
  });
});

