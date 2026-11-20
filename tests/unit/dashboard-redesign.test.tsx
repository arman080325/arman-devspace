import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import {
  Hundred,
  HundredLegend,
  projectToCellPhase,
  projectToSpecPlate,
  sortProjects,
  phaseCounts,
} from "@/components/redesign/Hundred";
import {
  DashboardOverview,
  DashboardMetrics,
  AttentionQueue,
  SignalStream,
  PinnedProjects,
  DistributionPanel,
  MilestonesPanel,
} from "@/components/dashboard";
import { projects as canonicalProjects } from "@/data/projects";
import type { Project, WorkspaceStats, SessionUser } from "@/types/project";
import type { ActivityEvent } from "@/types/activity";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/dashboard",
}));

const mockUser: SessionUser = {
  id: "u-arman",
  email: "arman@devspace.io",
  name: "Arman",
  role: "owner",
};

const mockStats: WorkspaceStats = {
  totalProjects: 100,
  definedProjects: 100,
  placeholderProjects: 0,
  completedProjects: 8,
  inDevelopmentProjects: 10,
  activeProjects: 14,
  awaitingProjects: 78,
  statusCounts: {
    awaiting: 70,
    backlog: 8,
    cloned: 0,
    analyzing: 0,
    planning: 0,
    "in-development": 10,
    testing: 4,
    completed: 8,
  },
  difficultyBreakdown: {
    beginner: { total: 30, completed: 3, active: 4 },
    intermediate: { total: 45, completed: 4, active: 7 },
    advanced: { total: 25, completed: 1, active: 3 },
  },
  technologyDistribution: [
    { name: "TypeScript", count: 42, completedCount: 5 },
    { name: "React", count: 38, completedCount: 4 },
    { name: "Next.js", count: 25, completedCount: 3 },
  ],
  technologiesExplored: 34,
  bookmarkedCount: 2,
  notesCount: 15,
  tasksCompleted: 48,
  tasksTotal: 250,
  overallCompletion: 19,
  streakDays: 7,
  weeklyActivity: [
    { day: "Mon", date: "2026-11-14", count: 3 },
    { day: "Tue", date: "2026-11-15", count: 5 },
    { day: "Wed", date: "2026-11-16", count: 2 },
    { day: "Thu", date: "2026-11-17", count: 8 },
    { day: "Fri", date: "2026-11-18", count: 4 },
    { day: "Sat", date: "2026-11-19", count: 1 },
    { day: "Sun", date: "2026-11-20", count: 6 },
  ],
};

const mockActivities: ActivityEvent[] = [
  {
    id: "act-1",
    userId: "u-arman",
    projectId: "project-31",
    projectSlug: "social-media-platform",
    projectTitle: "Social Media Platform",
    projectNumber: 31,
    category: "repository",
    type: "git_push",
    severity: "info",
    title: "Pushed 3 commits to master",
    description: "Refactor auth and feed pagination",
    sourceProvider: "github",
    dedupKey: "git_push:p31",
    isRead: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "act-2",
    userId: "u-arman",
    projectId: "project-1",
    projectSlug: "online-bookstore",
    projectTitle: "Online Bookstore",
    projectNumber: 1,
    category: "deployment",
    type: "deployment_success",
    severity: "success",
    title: "Production deployment succeeded",
    description: "Deployed commit 7f8a9b",
    sourceProvider: "vercel",
    dedupKey: "deploy:p1",
    isRead: true,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "act-3",
    userId: "u-arman",
    projectId: "project-5",
    projectSlug: "markdown-editor",
    projectTitle: "Markdown Note Taking App",
    projectNumber: 5,
    category: "ci",
    type: "workflow_run_failed",
    severity: "critical",
    title: "CI Workflow run failed on main",
    description: "Tests failed on Node.js 22 runner",
    sourceProvider: "github",
    dedupKey: "ci:p5",
    isRead: false,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

describe("Redesign Milestone 3 Dashboard & The Hundred", () => {
  beforeEach(() => {
    mockPush.mockClear();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      }),
    );
  });

  describe("Hundred Core Visualization & Helpers", () => {
    it("renders exactly 100 interactive project cells in hero mode", () => {
      render(<Hundred size="hero" projects={canonicalProjects} />);
      const grid = screen.getByRole("grid", { name: /The Hundred/i });
      expect(grid).toBeInTheDocument();

      const cells = screen.getAllByRole("gridcell");
      expect(cells).toHaveLength(100);
    });

    it("maps all project lifecycle statuses to proper redesign phases", () => {
      const base = canonicalProjects[0];

      expect(projectToCellPhase({ ...base, status: "completed" })).toBe("shipped");
      expect(projectToCellPhase({ ...base, status: "in-development" })).toBe("building");
      expect(projectToCellPhase({ ...base, status: "testing" })).toBe("building");
      expect(projectToCellPhase({ ...base, status: "analyzing" })).toBe("rebuilding");
      expect(projectToCellPhase({ ...base, status: "planning" })).toBe("rebuilding");
      expect(projectToCellPhase({ ...base, status: "awaiting" })).toBe("exploring");
      expect(projectToCellPhase({ ...base, status: "backlog" })).toBe("exploring");
      expect(projectToCellPhase({ ...base, status: "cloned" })).toBe("exploring");
      expect(projectToCellPhase({ ...base, isPlaceholder: true })).toBe("unknown");
      expect(projectToCellPhase({ ...base, verificationStatus: "archived" })).toBe(
        "archived",
      );

      // Failing CI triggers breaking
      const breakingProject: Project = {
        ...base,
        repositoryMetadata: {
          projectId: base.id,
          owner: "test",
          repoName: "test",
          defaultBranch: "main",
          description: null,
          primaryLanguage: "TypeScript",
          stars: 10,
          forks: 2,
          openIssues: 0,
          lastUpdated: null,
          isArchived: false,
          hasReadme: true,
          license: "MIT",
          topics: [],
          verifiedAt: null,
          latestWorkflowRun: {
            id: 123,
            name: "CI",
            branch: "main",
            commitSha: "abc",
            commitShortSha: "abc",
            status: "completed",
            conclusion: "failure",
            url: "https://github.com",
            createdAt: "2026-11-20",
            updatedAt: "2026-11-20",
            event: "push",
            actor: "test",
          },
        },
      };
      expect(projectToCellPhase(breakingProject)).toBe("breaking");
    });

    it("maintains stable 001-100 ordering and allows sorting", () => {
      const byNumber = sortProjects(canonicalProjects, "number");
      expect(byNumber[0].number).toBe(1);
      expect(byNumber[99].number).toBe(100);

      const byPhase = sortProjects(canonicalProjects, "phase");
      expect(byPhase).toHaveLength(100);

      const byCat = sortProjects(canonicalProjects, "category");
      expect(byCat).toHaveLength(100);
    });

    it("calculates phase counts that sum to the total project count", () => {
      const counts = phaseCounts(canonicalProjects);
      const total =
        counts.exploring +
        counts.building +
        counts.shipped +
        counts.breaking +
        counts.rebuilding +
        counts.archived +
        counts.unknown;
      expect(total).toBe(100);
    });

    it("navigates to project workspace on cell click", () => {
      render(<Hundred size="hero" projects={canonicalProjects} />);
      const cell1 = screen.getByRole("gridcell", { name: /001/i });
      fireEvent.click(cell1);
      expect(mockPush).toHaveBeenCalledWith(`/projects/${canonicalProjects[0].slug}`);
    });

    it("handles keyboard navigation across cells", () => {
      render(<Hundred size="hero" projects={canonicalProjects} />);
      const cell1 = screen.getByRole("gridcell", { name: /001/i });
      cell1.focus();

      // Press ArrowRight to move to cell index 1
      fireEvent.keyDown(cell1, { key: "ArrowRight" });
      const cell2 = screen.getByRole("gridcell", { name: /002/i });
      expect(cell2).toHaveFocus();

      // Press Enter to open
      fireEvent.keyDown(cell2, { key: "Enter" });
      expect(mockPush).toHaveBeenCalledWith(`/projects/${canonicalProjects[1].slug}`);
    });

    it("converts project to SpecPlate schema properly", () => {
      const plate = projectToSpecPlate(canonicalProjects[30]); // #31
      expect(plate.num).toBe(31);
      expect(plate.id).toBe("031");
      expect(plate.name).toBe("Social Media Platform");
      expect(plate.slug).toBe("social-media-platform");
      expect(plate.phase).toBeDefined();
    });
  });

  describe("HundredLegend component", () => {
    it("renders total project count and all 5 phase filters", () => {
      const onLens = vi.fn();
      render(<HundredLegend projects={canonicalProjects} onLens={onLens} />);

      expect(screen.getByText("100")).toBeInTheDocument();
      expect(screen.getByText("projects")).toBeInTheDocument();

      const exploreBtn = screen.getByRole("button", { name: /exploring/i });
      expect(exploreBtn).toBeInTheDocument();
      fireEvent.click(exploreBtn);
      expect(onLens).toHaveBeenCalledWith("exploring");
    });
  });

  describe("DashboardMetrics component", () => {
    it("renders all 5 metric cards with real data values", () => {
      render(<DashboardMetrics stats={mockStats} projects={canonicalProjects} />);
      expect(screen.getByText("Total Projects")).toBeInTheDocument();
      expect(screen.getByText("Active Pipeline")).toBeInTheDocument();
      expect(screen.getByText("Shipped")).toBeInTheDocument();
      expect(screen.getByText("Needs Attention")).toBeInTheDocument();
      expect(screen.getByText("Technologies")).toBeInTheDocument();

      expect(screen.getByText("100")).toBeInTheDocument();
      expect(screen.getByText("14")).toBeInTheDocument();
      expect(screen.getByText("8")).toBeInTheDocument();
      expect(screen.getByText("34")).toBeInTheDocument();
    });
  });

  describe("AttentionQueue component", () => {
    it("renders empty state when all projects are healthy", () => {
      const cleanProjects = canonicalProjects.map((p) => ({
        ...p,
        discrepancyNotes: null,
        repositoryMetadata: null,
      }));
      render(<AttentionQueue projects={cleanProjects} />);
      expect(screen.getByText("Nothing needs you right now.")).toBeInTheDocument();
    });

    it("prioritizes breaking issues when failing CI or degraded health exists", () => {
      const brokenProjects: Project[] = [
        ...canonicalProjects.slice(1),
        {
          ...canonicalProjects[0],
          repositoryMetadata: {
            projectId: canonicalProjects[0].id,
            owner: "test",
            repoName: "test",
            defaultBranch: "main",
            description: null,
            primaryLanguage: "TypeScript",
            stars: 0,
            forks: 0,
            openIssues: 0,
            lastUpdated: null,
            isArchived: false,
            hasReadme: true,
            license: null,
            topics: [],
            verifiedAt: null,
            latestWorkflowRun: {
              id: 99,
              name: "CI",
              branch: "main",
              commitSha: "123",
              commitShortSha: "123",
              status: "completed",
              conclusion: "failure",
              url: "https://github.com",
              createdAt: "2026-11-20",
              updatedAt: "2026-11-20",
              event: "push",
              actor: "test",
            },
          },
        },
      ];

      render(<AttentionQueue projects={brokenProjects} />);
      expect(screen.getByText("Needs you")).toBeInTheDocument();
      expect(screen.getByText("CI workflow run failed")).toBeInTheDocument();
      expect(screen.getByText("Breaking")).toBeInTheDocument();
    });
  });

  describe("SignalStream component", () => {
    it("renders real activity events and supports tab filtering", () => {
      render(<SignalStream events={mockActivities} />);
      expect(screen.getByText("Signal Stream")).toBeInTheDocument();
      expect(screen.getByText("Pushed 3 commits to master")).toBeInTheDocument();
      expect(screen.getByText("Production deployment succeeded")).toBeInTheDocument();

      // Click CI runs tab
      const ciTab = screen.getByRole("tab", { name: "CI runs" });
      fireEvent.click(ciTab);
      expect(screen.getByText("CI Workflow run failed on main")).toBeInTheDocument();
      expect(screen.queryByText("Pushed 3 commits to master")).not.toBeInTheDocument();
    });

    it("renders empty state when no events exist", () => {
      render(<SignalStream events={[]} />);
      expect(screen.getByText("No recent activity.")).toBeInTheDocument();
    });
  });

  describe("PinnedProjects component", () => {
    it("renders empty state when no projects are bookmarked", () => {
      const unbookmarked = canonicalProjects.map((p) => ({ ...p, bookmarked: false }));
      render(<PinnedProjects initialProjects={unbookmarked} />);
      expect(screen.getByText("Nothing pinned yet.")).toBeInTheDocument();
    });

    it("renders pinned cards when projects have bookmarked true", () => {
      const bookmarked = canonicalProjects.map((p, idx) =>
        idx === 0 || idx === 30 ? { ...p, bookmarked: true } : p,
      );
      render(<PinnedProjects initialProjects={bookmarked} />);
      expect(screen.getByText("Pinned")).toBeInTheDocument();
      expect(screen.getByText("2 of 5")).toBeInTheDocument();
      expect(screen.getByText("Online Bookstore")).toBeInTheDocument();
      expect(screen.getByText("Social Media Platform")).toBeInTheDocument();
    });
  });

  describe("DistributionPanel component", () => {
    it("renders category breakdown and technology bars", () => {
      render(<DistributionPanel projects={canonicalProjects} />);
      expect(screen.getByText("Distribution")).toBeInTheDocument();
      expect(screen.getByText("By category, 100 units")).toBeInTheDocument();
      expect(screen.getByText("Most Used Technology")).toBeInTheDocument();
      expect(screen.getByText("Security")).toBeInTheDocument();
      expect(screen.getByText("Web apps")).toBeInTheDocument();
    });
  });

  describe("MilestonesPanel component", () => {
    it("renders upcoming and overdue milestones", () => {
      const milestones = [
        {
          id: "m-1",
          title: "Implement OAuth flow",
          projectTitle: "Social Media Platform",
          projectSlug: "social-media-platform",
          projectNumber: 31,
          dueDate: "2026-12-01",
        },
        {
          id: "m-2",
          title: "Setup Vitest test suite",
          projectTitle: "Online Bookstore",
          projectSlug: "online-bookstore",
          projectNumber: 1,
          dueDate: "2026-01-01", // Past date -> overdue
        },
      ];

      render(<MilestonesPanel milestones={milestones} />);
      expect(screen.getByText("Milestones Due")).toBeInTheDocument();
      expect(screen.getByText("Implement OAuth flow")).toBeInTheDocument();
      expect(screen.getByText("Setup Vitest test suite")).toBeInTheDocument();
      expect(screen.getByText("Overdue")).toBeInTheDocument();
    });

    it("renders empty state when no milestones exist", () => {
      render(<MilestonesPanel milestones={[]} />);
      expect(screen.getByText("No upcoming milestones.")).toBeInTheDocument();
    });
  });

  describe("DashboardOverview full composition", () => {
    it("renders master dashboard with all sections integrated", () => {
      render(
        <DashboardOverview
          user={mockUser}
          projects={canonicalProjects}
          stats={mockStats}
          activities={mockActivities}
          milestones={[]}
        />,
      );

      // Header greeting & subtitle
      expect(
        screen.getByText(/Good (morning|afternoon|evening), Arman\./),
      ).toBeInTheDocument();
      expect(
        screen.getAllByRole("link", { name: /All projects/i }).length,
      ).toBeGreaterThan(0);
      expect(
        screen.getAllByRole("link", { name: /Activity Center/i }).length,
      ).toBeGreaterThan(0);
      expect(screen.getAllByRole("link", { name: /Roadmaps/i }).length).toBeGreaterThan(
        0,
      );

      // All major panels
      expect(screen.getByText("The Hundred")).toBeInTheDocument();
      expect(screen.getByText("Needs you")).toBeInTheDocument();
      expect(screen.getByText("Signal Stream")).toBeInTheDocument();
      expect(screen.getByText("Pinned")).toBeInTheDocument();
      expect(screen.getByText("Distribution")).toBeInTheDocument();
      expect(screen.getByText("Milestones Due")).toBeInTheDocument();
    });
  });
});
