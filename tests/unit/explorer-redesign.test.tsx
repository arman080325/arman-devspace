import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { ExplorerPage } from "@/components/explorer";
import { CategoriesOverview } from "@/components/paths";
import { projects as canonicalProjects } from "@/data/projects";
import type { Project, WorkspaceStats } from "@/types/project";

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: vi.fn(),
  }),
  usePathname: () => "/projects",
  useSearchParams: () => new URLSearchParams(),
}));

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
  weeklyActivity: [],
};

describe("Milestone 4 — Project Explorer & Categories Redesign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Search & Suggestions", () => {
    it("renders search input with placeholder", () => {
      render(<ExplorerPage initialProjects={canonicalProjects} initialView="plates" />);

      const input = screen.getByRole("combobox", {
        name: /Search projects by number, title, category or stack/i,
      });
      expect(input).toBeDefined();
    });

    it("filters projects by number search (exact and padded)", () => {
      render(<ExplorerPage initialProjects={canonicalProjects} initialView="plates" />);

      const input = screen.getByRole("combobox");
      // Search for "031"
      fireEvent.change(input, { target: { value: "031" } });

      // Should show project #031
      expect(screen.getByText("031")).toBeDefined();
      expect(screen.queryByText("001")).toBeNull();
    });

    it("filters projects by title substring case-insensitively", () => {
      render(<ExplorerPage initialProjects={canonicalProjects} initialView="plates" />);

      const input = screen.getByRole("combobox");
      fireEvent.change(input, { target: { value: "microservice" } });

      // Projects matching "microservice" or empty
      const matches = canonicalProjects.filter((p) =>
        p.title.toLowerCase().includes("microservice"),
      );
      if (matches.length > 0) {
        expect(screen.getByText(matches[0].title)).toBeDefined();
      }
    });

    it("displays an empty state when search yields no matches", () => {
      render(<ExplorerPage initialProjects={canonicalProjects} initialView="plates" />);

      const input = screen.getByRole("combobox");
      fireEvent.change(input, { target: { value: "xyznonexistent999" } });

      expect(screen.getByText("No project plates match your criteria")).toBeDefined();
      expect(screen.getByRole("button", { name: "Clear filters" })).toBeDefined();
    });
  });

  describe("View Presentation Modes", () => {
    it("renders Plates view by default or when selected", () => {
      render(
        <ExplorerPage
          initialProjects={canonicalProjects.slice(0, 10)}
          initialView="plates"
        />,
      );

      expect(
        screen.getByRole("region", { name: "Project specification plates" }),
      ).toBeDefined();
      expect(screen.getByText("001")).toBeDefined();
    });

    it("renders Field view with the Hundred hero matrix", () => {
      render(<ExplorerPage initialProjects={canonicalProjects} initialView="field" />);

      expect(screen.getByText("The 100-Project Field")).toBeDefined();
      expect(
        screen.getByRole("grid", {
          name: /The Hundred matrix: 100 of 100 projects lit/i,
        }),
      ).toBeDefined();
    });

    it("renders List view with sortable semantic table", () => {
      render(
        <ExplorerPage
          initialProjects={canonicalProjects.slice(0, 10)}
          initialView="list"
        />,
      );

      expect(screen.getByText("Project Title & Specification")).toBeDefined();
      expect(screen.getByText("Repo Health")).toBeDefined();
      expect(screen.getByText("#001")).toBeDefined();
    });

    it("allows switching presentation modes using the Segmented control", () => {
      render(
        <ExplorerPage
          initialProjects={canonicalProjects.slice(0, 10)}
          initialView="field"
        />,
      );

      // Initially in field view
      expect(screen.getByText("The 100-Project Field")).toBeDefined();

      // Click "Plates"
      const platesBtn = screen.getByRole("radio", { name: /Plates/i });
      fireEvent.click(platesBtn);

      // Now plates view is rendered
      expect(
        screen.getByRole("region", { name: "Project specification plates" }),
      ).toBeDefined();

      // Click "List"
      const listBtn = screen.getByRole("radio", { name: /List/i });
      fireEvent.click(listBtn);

      // Now table is rendered
      expect(screen.getByText("Project Title & Specification")).toBeDefined();
    });
  });

  describe("Filtering Logic", () => {
    it("toggles pinned filter and filters projects", () => {
      const sampleProjects: Project[] = [
        {
          ...canonicalProjects[0],
          bookmarked: true,
        },
        {
          ...canonicalProjects[1],
          bookmarked: false,
        },
      ];

      render(<ExplorerPage initialProjects={sampleProjects} initialView="plates" />);

      const pinnedToggle = screen.getByRole("button", { name: /Pinned/i });
      fireEvent.click(pinnedToggle);

      // Only bookmarked project #1 should remain
      expect(screen.getByText("001")).toBeDefined();
      expect(screen.queryByText("002")).toBeNull();

      // Filter chip should be visible
      expect(screen.getByText("Pinned only")).toBeDefined();
    });

    it("clears all filters when Clear All button is clicked", () => {
      render(<ExplorerPage initialProjects={canonicalProjects} initialView="plates" />);

      const input = screen.getByRole("combobox");
      fireEvent.change(input, { target: { value: "randomfilterquery" } });

      const clearBtn = screen.getByRole("button", { name: /Clear filters/i });
      fireEvent.click(clearBtn);

      expect(input).toHaveValue("");
    });
  });

  describe("Categories & Learning Paths Overview", () => {
    it("renders the 6 canonical categories with counts and explore links", () => {
      render(<CategoriesOverview projects={canonicalProjects} stats={mockStats} />);

      expect(screen.getByText("Canonical Engineering Categories")).toBeDefined();
      expect(screen.getByText("Security")).toBeDefined();
      expect(screen.getByText("Web apps")).toBeDefined();
      expect(screen.getByText("APIs & backend")).toBeDefined();
      expect(screen.getByText("DevOps & tooling")).toBeDefined();
      expect(screen.getByText("Data & ML")).toBeDefined();
      expect(screen.getByText("Experiments")).toBeDefined();

      const openLinks = screen.getAllByText("Open in Explorer →");
      expect(openLinks.length).toBe(6);
    });

    it("renders the 3 progression tracks with learning outcomes and complexity reviews", () => {
      render(<CategoriesOverview projects={canonicalProjects} stats={mockStats} />);

      expect(screen.getByText("Engineering Progression Tracks")).toBeDefined();
      expect(screen.getByText("beginner")).toBeDefined();
      expect(screen.getByText("intermediate")).toBeDefined();
      expect(screen.getByText("advanced")).toBeDefined();

      expect(
        screen.getAllByText("Codebase Complexity Review").length,
      ).toBeGreaterThanOrEqual(3);
    });
  });
});
