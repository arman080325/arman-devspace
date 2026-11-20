import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { ProjectWorkspace } from "@/components/projects/workspace/project-workspace";
import { WorkspaceHeader } from "@/components/projects/workspace/workspace-header";
import { WorkspaceTabs } from "@/components/projects/workspace/workspace-tabs";
import { OverviewTab } from "@/components/projects/workspace/tabs/overview-tab";
import { RoadmapTab } from "@/components/projects/workspace/tabs/roadmap-tab";
import { MilestonesTab } from "@/components/projects/workspace/tabs/milestones-tab";
import { GitHubTab } from "@/components/projects/workspace/tabs/github-tab";
import { DeploymentsTab } from "@/components/projects/workspace/tabs/deployments-tab";
import { ActivityTab } from "@/components/projects/workspace/tabs/activity-tab";
import { DocsTab } from "@/components/projects/workspace/tabs/docs-tab";
import { projects as canonicalProjects } from "@/data/projects";
import type { Project, ProjectProgress } from "@/types/project";

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
let currentSearch = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: vi.fn(),
  }),
  usePathname: () => "/projects/online-bookstore",
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

const mockProject: Project = {
  ...canonicalProjects[0],
  originalRepoUrl: "https://github.com/arman080325/arman-devspace",
  verifiedRepoUrl: "https://github.com/arman080325/arman-devspace",
  deploymentUrl: "https://arman-devspace.vercel.app",
  repositoryMetadata: {
    projectId: canonicalProjects[0].id,
    owner: "arman080325",
    repoName: "arman-devspace",
    defaultBranch: "main",
    description: "Devspace platform",
    primaryLanguage: "TypeScript",
    stars: 12,
    forks: 3,
    openIssues: 2,
    lastUpdated: "2026-04-05T12:00:00Z",
    isArchived: false,
    hasReadme: true,
    license: "MIT",
    topics: ["nextjs", "react"],
    verifiedAt: "2026-04-05T12:00:00Z",
    health: {
      status: "healthy",
      availability: "reachable",
      freshness: "active",
      daysSincePush: 1,
      signals: ["README present", "License present", "CI workflows present"],
    },
    latestCommit: {
      sha: "abc1234567890",
      shortSha: "abc1234",
      message: "feat: redesign individual project workspaces",
      authorName: "Arman",
      date: "2026-04-05T12:00:00Z",
      url: "https://github.com/arman080325/arman-devspace/commit/abc1234",
    },
  },
};

const mockProgress: ProjectProgress = {
  userId: "user-1",
  projectId: canonicalProjects[0].id,
  status: "in-development",
  completionPercentage: 50,
  localClonePath: null,
  deploymentUrl: null,
  originalArchitecture: null,
  modernizationArchitecture: "Focusing on completing the 7 tabs",
  technicalDocumentation: "Technical blueprint and architecture details",
  testingSummary: null,
  startedAt: null,
  completedAt: null,
  lastAccessedAt: "2026-04-05T12:00:00Z",
  bookmarked: true,
  notes: [
    {
      id: "note-1",
      projectId: canonicalProjects[0].id,
      userId: "user-1",
      title: "Architecture Decisions",
      content: "Next.js 16 with Tailwind v4",
      type: "architecture",
      createdAt: "2026-04-01T00:00:00Z",
      updatedAt: "2026-04-01T00:00:00Z",
    },
  ],
  tasks: [
    {
      id: "task-1",
      projectId: canonicalProjects[0].id,
      userId: "user-1",
      title: "Design token audit",
      completed: true,
      phase: "Phase 1: Architecture Review & Setup",
      order: 1,
      createdAt: "2026-04-01T00:00:00Z",
      completedAt: "2026-04-01T12:00:00Z",
    },
    {
      id: "task-2",
      projectId: canonicalProjects[0].id,
      userId: "user-1",
      title: "Implement 7 workspace tabs",
      completed: false,
      phase: "Phase 2: Code Quality & Modernization",
      order: 2,
      createdAt: "2026-04-02T00:00:00Z",
      completedAt: null,
    },
  ],
  milestones: [
    {
      id: "ms-1",
      projectId: canonicalProjects[0].id,
      title: "Design Tokens & Primitives",
      completed: true,
      completedAt: "2026-04-01T00:00:00Z",
      dueDate: "2026-04-01",
    },
    {
      id: "ms-2",
      projectId: canonicalProjects[0].id,
      title: "Full Workspace Redesign",
      completed: false,
      completedAt: null,
      dueDate: "2026-12-31",
    },
  ],
  roadmap: [
    {
      id: "rm-1",
      projectId: canonicalProjects[0].id,
      phase: 1,
      title: "Phase 1: Architecture Review & Setup",
      description: "Initial setup",
      status: "completed",
      order: 1,
    },
    {
      id: "rm-2",
      projectId: canonicalProjects[0].id,
      phase: 2,
      title: "Phase 2: Code Quality & Modernization",
      description: "Active work",
      status: "in-progress",
      order: 2,
    },
  ],
  deployments: [
    {
      id: "dep-1",
      projectId: canonicalProjects[0].id,
      environment: "production",
      url: "https://arman-devspace.vercel.app",
      status: "active",
      provider: "Vercel",
      deployedAt: "2026-04-05T10:00:00Z",
      notes: "Deploy production build",
    },
  ],
  activities: [
    {
      id: "act-1",
      projectId: canonicalProjects[0].id,
      userId: "user-1",
      action: "deployment",
      summary: "Successful production deployment",
      createdAt: "2026-04-05T10:00:00Z",
      type: "deployment",
      description: "Successful production deployment",
      timestamp: "2026-04-05T10:00:00Z",
    },
  ],
  screenshots: [],
};

describe("Milestone 5 — Individual Project Workspace Redesign", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
    currentSearch = "";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/activity")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              events: [
                {
                  id: "act-1",
                  type: "deployment",
                  title: "Deployed to production",
                  description: "Successful production deployment",
                  timestamp: "2026-04-05T10:00:00Z",
                },
              ],
            }),
          });
        }
        if (url.includes("/deployments")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              deployments: mockProgress.deployments,
            }),
          });
        }
        if (url.includes("/screenshots")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              screenshots: [],
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      }),
    );
  });

  describe("WorkspaceHeader Component", () => {
    it("renders project number, title, difficulty, and stack tags", () => {
      render(
        <WorkspaceHeader
          project={mockProject}
          progress={mockProgress}
          isAuthenticated={true}
          prevProject={{ number: 100, title: "Last Project", slug: "last-project" }}
          nextProject={{ number: 2, title: "Next Project", slug: "next-project" }}
          onTogglePin={vi.fn()}
        />,
      );

      expect(screen.getByText("001")).toBeInTheDocument();
      expect(screen.getByText(mockProject.title)).toBeInTheDocument();
      expect(screen.getByText(mockProject.category)).toBeInTheDocument();
      expect(screen.getByText(mockProject.difficulty)).toBeInTheDocument();
      expect(screen.getByText(mockProject.technologies[0])).toBeInTheDocument();
    });

    it("renders previous and next jump buttons and links", () => {
      render(
        <WorkspaceHeader
          project={mockProject}
          progress={mockProgress}
          isAuthenticated={true}
          prevProject={{ number: 100, title: "Last Project", slug: "last-project" }}
          nextProject={{ number: 2, title: "Next Project", slug: "next-project" }}
          onTogglePin={vi.fn()}
        />,
      );

      const prevBtn = screen.getByRole("button", { name: /Previous: #100/i });
      const nextBtn = screen.getByRole("button", { name: /Next: #002/i });
      expect(prevBtn).toBeInTheDocument();
      expect(nextBtn).toBeInTheDocument();

      fireEvent.click(prevBtn);
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("last-project"));
    });

    it("triggers pin toggle callback", () => {
      const handleTogglePin = vi.fn();
      render(
        <WorkspaceHeader
          project={mockProject}
          progress={mockProgress}
          isAuthenticated={true}
          prevProject={null}
          nextProject={null}
          onTogglePin={handleTogglePin}
        />,
      );

      const pinBtn = screen.getByRole("button", { name: /pinned/i });
      fireEvent.click(pinBtn);
      expect(handleTogglePin).toHaveBeenCalled();
    });
  });

  describe("WorkspaceTabs Component", () => {
    it("renders all 7 tabs with milestone count", () => {
      const handleTabChange = vi.fn();
      render(
        <WorkspaceTabs
          activeTab="overview"
          onTabChange={handleTabChange}
          milestonesCount={2}
        />,
      );

      expect(screen.getByText("Overview")).toBeInTheDocument();
      expect(screen.getByText("Roadmap")).toBeInTheDocument();
      expect(screen.getByText("Milestones")).toBeInTheDocument();
      expect(screen.getByText("GitHub Intelligence")).toBeInTheDocument();
      expect(screen.getByText("Deployments & CI/CD")).toBeInTheDocument();
      expect(screen.getByText("Activity")).toBeInTheDocument();
      expect(screen.getByText("Docs & Screenshots")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("invokes onTabChange when clicking a tab", () => {
      const handleTabChange = vi.fn();
      render(<WorkspaceTabs activeTab="overview" onTabChange={handleTabChange} />);

      fireEvent.click(screen.getByText("Milestones"));
      expect(handleTabChange).toHaveBeenCalledWith("milestones");
    });
  });

  describe("Tab 1: OverviewTab", () => {
    it("renders project description, facts, workspace status and focus", () => {
      render(
        <OverviewTab
          project={mockProject}
          progress={mockProgress}
          onUpdateFocus={vi.fn()}
          onNavigateTab={vi.fn()}
        />,
      );

      expect(screen.getByText("Technical Summary")).toBeInTheDocument();
      expect(screen.getByText(mockProject.description)).toBeInTheDocument();
      expect(screen.getByText("Current Focus")).toBeInTheDocument();
      expect(screen.getByText("Focusing on completing the 7 tabs")).toBeInTheDocument();
      expect(screen.getByText("Workspace Status")).toBeInTheDocument();
      expect(screen.getByText("Repository Intelligence")).toBeInTheDocument();
      expect(screen.getByText(/React/i)).toBeInTheDocument();
    });
  });

  describe("Tab 2: RoadmapTab", () => {
    it("renders canonical workflow phases and task checklist", () => {
      render(
        <RoadmapTab
          project={mockProject}
          progress={mockProgress}
          onUpdatePhaseStatus={vi.fn()}
          onToggleTask={vi.fn()}
          onCreateTask={vi.fn()}
          onDeleteTask={vi.fn()}
        />,
      );

      expect(screen.getByText("Workflow Lifecycle Phases")).toBeInTheDocument();
      expect(
        screen.getAllByText("Phase 1: Architecture Review & Setup").length,
      ).toBeGreaterThanOrEqual(1);
      expect(
        screen.getAllByText("Phase 2: Code Quality & Modernization").length,
      ).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Modernization Checklist")).toBeInTheDocument();
      expect(screen.getByText("Design token audit")).toBeInTheDocument();
      expect(screen.getByText("Implement 7 workspace tabs")).toBeInTheDocument();
    });

    it("allows adding a new task", () => {
      const handleCreateTask = vi.fn();
      render(
        <RoadmapTab
          project={mockProject}
          progress={mockProgress}
          onUpdatePhaseStatus={vi.fn()}
          onToggleTask={vi.fn()}
          onCreateTask={handleCreateTask}
          onDeleteTask={vi.fn()}
        />,
      );

      const input = screen.getByPlaceholderText(/modernization task/i);
      fireEvent.change(input, { target: { value: "Run integration tests" } });
      const addBtn = screen.getByRole("button", { name: /^add$/i });
      fireEvent.click(addBtn);

      expect(handleCreateTask).toHaveBeenCalledWith(
        "Run integration tests",
        expect.any(String),
      );
    });
  });

  describe("Tab 3: MilestonesTab", () => {
    it("renders milestones with status badges and completion metrics", () => {
      render(
        <MilestonesTab
          project={mockProject}
          progress={mockProgress}
          onCreateMilestone={vi.fn()}
          onToggleMilestone={vi.fn()}
        />,
      );

      expect(screen.getByText("Full Workspace Redesign")).toBeInTheDocument();
      expect(screen.getByText("Design Tokens & Primitives")).toBeInTheDocument();
      expect(screen.getByText("DONE")).toBeInTheDocument();
      expect(screen.getByText("OPEN")).toBeInTheDocument();
      expect(screen.getByText(/1 of 2 completed/i)).toBeInTheDocument();
    });
  });

  describe("Tab 4: GitHubTab", () => {
    it("renders repository telemetry and health checks", () => {
      render(
        <GitHubTab
          project={mockProject}
          onSyncGithub={vi.fn()}
          onVerifyOverride={vi.fn()}
        />,
      );

      expect(screen.getByText("Repository Telemetry")).toBeInTheDocument();
      expect(screen.getByText("Branch: main")).toBeInTheDocument();
      expect(screen.getByText("12")).toBeInTheDocument(); // Stars
      expect(screen.getByText("3")).toBeInTheDocument(); // Forks
      expect(screen.getByText("Repository Health Checks")).toBeInTheDocument();
      expect(screen.getByText("README Documentation")).toBeInTheDocument();
      expect(screen.getByText("Open Source License")).toBeInTheDocument();
    });
  });

  describe("Tab 5: DeploymentsTab", () => {
    it("renders environments cards and deployment history", () => {
      render(
        <DeploymentsTab
          project={mockProject}
          progress={mockProgress}
          onAddDeployment={vi.fn()}
          onDeleteDeployment={vi.fn()}
        />,
      );

      expect(screen.getByRole("heading", { name: "Production" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Preview" })).toBeInTheDocument();
      expect(screen.getByText("Register Deployment Record")).toBeInTheDocument();
      expect(screen.getByText("Deployment History")).toBeInTheDocument();
      expect(
        screen.getAllByText("https://arman-devspace.vercel.app").length,
      ).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Tab 6: ActivityTab", () => {
    it("renders activity logbook and filter chips", () => {
      render(<ActivityTab project={mockProject} progress={mockProgress} />);

      expect(screen.getByText("Project Activity Logbook")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^all$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^deployment$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^status$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^github$/i })).toBeInTheDocument();
      expect(screen.getByText("Successful production deployment")).toBeInTheDocument();
    });
  });

  describe("Tab 7: DocsTab", () => {
    it("renders architecture blueprint, notes and screenshot gallery", () => {
      render(
        <DocsTab
          project={mockProject}
          progress={mockProgress}
          onSaveArchitectureDocs={vi.fn()}
          onCreateNote={vi.fn()}
          onDeleteNote={vi.fn()}
          onAddScreenshot={vi.fn()}
          onDeleteScreenshot={vi.fn()}
        />,
      );

      expect(
        screen.getByText("Architecture & Implementation Blueprint"),
      ).toBeInTheDocument();
      expect(screen.getByText("Original Architecture (Legacy)")).toBeInTheDocument();
      expect(screen.getByText("Modernization Architecture (Target)")).toBeInTheDocument();
      expect(screen.getByText("Project Engineering Notes")).toBeInTheDocument();
      expect(screen.getByText("Architecture Decisions")).toBeInTheDocument();
      expect(screen.getByText("Screenshots & Design Artifacts")).toBeInTheDocument();
    });
  });

  describe("ProjectWorkspace Integration", () => {
    it("renders workspace and switches tabs seamlessly", () => {
      render(
        <ProjectWorkspace
          initialProject={mockProject}
          initialProgress={mockProgress}
          isAuthenticated={true}
          prevProject={null}
          nextProject={null}
          initialTab="overview"
        />,
      );

      expect(screen.getByText("Technical Summary")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("tab", { name: /Roadmap/i }));
      expect(screen.getByText("Workflow Lifecycle Phases")).toBeInTheDocument();
      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringContaining("tab=roadmap"),
        expect.anything(),
      );
    });

    it("falls back to overview tab when invalid tab is provided", () => {
      render(
        <ProjectWorkspace
          initialProject={mockProject}
          initialProgress={mockProgress}
          isAuthenticated={true}
          prevProject={null}
          nextProject={null}
          initialTab="invalid-non-existent-tab"
        />,
      );

      expect(screen.getByText("Technical Summary")).toBeInTheDocument();
    });
  });
});
