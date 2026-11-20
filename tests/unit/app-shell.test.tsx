import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import {
  computeBreadcrumbs,
  PageBreadcrumbs,
  statusToPhase,
  MiniHundred,
  NumericJump,
  Sidebar,
  TopBar,
  MobileNavDrawer,
  AppShell,
  PRIMARY_NAV_ITEMS,
  SECONDARY_NAV_ITEMS,
} from "@/components/shell";

// Mock next/navigation
let currentPathname = "/dashboard";
const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: mockRefresh,
  }),
}));

// Mock next-themes
vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "dark",
    setTheme: vi.fn(),
  }),
}));

describe("Redesign Milestone 2 Application Shell", () => {
  beforeEach(() => {
    currentPathname = "/dashboard";
    mockPush.mockClear();
    mockRefresh.mockClear();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ user: null }),
      }),
    );
  });

  describe("Breadcrumbs calculation and rendering", () => {
    it("computes breadcrumbs for root and dashboard", () => {
      expect(computeBreadcrumbs("/")).toEqual([{ label: "Overview" }]);
      expect(computeBreadcrumbs("/dashboard")).toEqual([{ label: "Overview" }]);
    });

    it("computes breadcrumbs for all projects listing", () => {
      expect(computeBreadcrumbs("/projects")).toEqual([{ label: "All projects" }]);
    });

    it("computes breadcrumbs for a specific project by slug", () => {
      const crumbs = computeBreadcrumbs("/projects/social-media-platform");
      expect(crumbs).toHaveLength(2);
      expect(crumbs[0]).toEqual({ label: "All projects", href: "/projects" });
      expect(crumbs[1].label).toBe("031 Social Media Platform");
      expect(crumbs[1].href).toBe("/projects/social-media-platform");
      expect(crumbs[1].num).toBe(true);
    });

    it("computes breadcrumbs for learning paths and sub-paths", () => {
      expect(computeBreadcrumbs("/paths")).toEqual([{ label: "Categories" }]);
      expect(computeBreadcrumbs("/paths/intermediate")).toEqual([
        { label: "Categories", href: "/paths" },
        { label: "Intermediate" },
      ]);
    });

    it("computes breadcrumbs for activity, kanban, technologies, journal, and analytics", () => {
      expect(computeBreadcrumbs("/activity")).toEqual([{ label: "Activity" }]);
      expect(computeBreadcrumbs("/kanban")).toEqual([{ label: "Roadmaps" }]);
      expect(computeBreadcrumbs("/technologies")).toEqual([
        { label: "Repository intelligence" },
      ]);
      expect(computeBreadcrumbs("/journal")).toEqual([{ label: "Engineering Journal" }]);
      expect(computeBreadcrumbs("/analytics")).toEqual([{ label: "Learning Analytics" }]);
      expect(computeBreadcrumbs("/settings")).toEqual([{ label: "Settings" }]);
    });

    it("renders PageBreadcrumbs with navigation landmark", () => {
      render(<PageBreadcrumbs pathname="/projects/social-media-platform" />);
      const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
      expect(nav).toBeInTheDocument();
      expect(screen.getByText("All projects")).toBeInTheDocument();
      expect(screen.getByText("031 Social Media Platform")).toBeInTheDocument();
    });
  });

  describe("MiniHundred status mapping and micro-grid", () => {
    it("correctly maps all project statuses to redesign cell phases", () => {
      expect(statusToPhase("awaiting")).toBe("exploring");
      expect(statusToPhase("backlog")).toBe("exploring");
      expect(statusToPhase("cloned")).toBe("exploring");
      expect(statusToPhase("analyzing")).toBe("exploring");
      expect(statusToPhase("planning")).toBe("exploring");
      expect(statusToPhase("in-development")).toBe("building");
      expect(statusToPhase("testing")).toBe("building");
      expect(statusToPhase("completed")).toBe("shipped");
    });

    it("renders 100 cell elements with accessible group label", () => {
      render(<MiniHundred />);
      const group = screen.getByRole("group", { name: "Mini map of all 100 projects" });
      expect(group).toBeInTheDocument();
      const links = screen.getAllByRole("link");
      expect(links.length).toBe(100);
    });

    it("highlights the active project cell", () => {
      const { container } = render(<MiniHundred activeNumber={31} />);
      const link31 = container.querySelector('a[href="/projects/social-media-platform"]');
      expect(link31).toBeInTheDocument();
    });
  });

  describe("NumericJump HUD", () => {
    it("returns null when buffer is empty", () => {
      const { container } = render(<NumericJump buffer="" onDismiss={vi.fn()} />);
      expect(container.firstChild).toBeNull();
    });

    it("renders status HUD when valid project number is typed", () => {
      render(<NumericJump buffer="031" onDismiss={vi.fn()} />);
      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByText("#031")).toBeInTheDocument();
      expect(screen.getByText("Social Media Platform")).toBeInTheDocument();
    });

    it("shows Project not found for out-of-range number", () => {
      render(<NumericJump buffer="999" onDismiss={vi.fn()} />);
      expect(screen.getByText("#999")).toBeInTheDocument();
      expect(screen.getByText("Project not found")).toBeInTheDocument();
    });

    it("calls onDismiss when dismiss button is clicked", () => {
      const onDismiss = vi.fn();
      render(<NumericJump buffer="031" onDismiss={onDismiss} />);
      const dismissBtn = screen.getByRole("button", { name: "Dismiss jump" });
      fireEvent.click(dismissBtn);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe("Sidebar component", () => {
    it("renders brand mark, wordmark, and primary/secondary nav items when expanded", () => {
      render(<Sidebar collapsed={false} />);
      expect(screen.getAllByText("Arman’s Devspace").length).toBeGreaterThan(0);

      for (const item of PRIMARY_NAV_ITEMS) {
        expect(screen.getByText(item.label)).toBeInTheDocument();
      }
      for (const item of SECONDARY_NAV_ITEMS) {
        expect(screen.getByText(item.label)).toBeInTheDocument();
      }
    });

    it("renders collapse toggle button and calls onToggleCollapse", () => {
      const onToggle = vi.fn();
      render(<Sidebar collapsed={false} onToggleCollapse={onToggle} />);
      const toggleBtn = screen.getByRole("button", { name: "Collapse sidebar" });
      fireEvent.click(toggleBtn);
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it("displays user initials when session user is authenticated", () => {
      render(
        <Sidebar
          collapsed={false}
          sessionUser={{
            id: "u1",
            email: "arman@devspace.io",
            name: "Arman Ali",
            role: "owner",
          }}
        />,
      );
      expect(screen.getByText("AA")).toBeInTheDocument();
      expect(screen.getByText("Arman Ali")).toBeInTheDocument();
    });
  });

  describe("TopBar component", () => {
    it("renders mobile menu button, search trigger, activity bell and breadcrumbs", () => {
      const onOpenMobileNav = vi.fn();
      const onOpenPalette = vi.fn();

      render(
        <TopBar onOpenMobileNav={onOpenMobileNav} onOpenCommandPalette={onOpenPalette} />,
      );

      const menuBtn = screen.getByRole("button", { name: "Open navigation menu" });
      expect(menuBtn).toBeInTheDocument();
      fireEvent.click(menuBtn);
      expect(onOpenMobileNav).toHaveBeenCalledTimes(1);

      const searchBtn = screen.getByRole("button", { name: "Open command palette" });
      expect(searchBtn).toBeInTheDocument();
      fireEvent.click(searchBtn);
      expect(onOpenPalette).toHaveBeenCalledTimes(1);

      expect(screen.getByRole("link", { name: "Activity Center" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
    });
  });

  describe("MobileNavDrawer component", () => {
    it("does not render dialog content when open is false", () => {
      render(<MobileNavDrawer open={false} onClose={vi.fn()} />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders navigation sheet when open is true and calls onClose on close button click", () => {
      const onClose = vi.fn();
      render(<MobileNavDrawer open={true} onClose={onClose} />);
      expect(screen.getByRole("dialog", { name: "Navigation menu" })).toBeInTheDocument();
      const closeBtn = screen.getByRole("button", { name: "Close navigation" });
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("AppShell layout integration", () => {
    it("renders children within main content region on normal pages", () => {
      render(
        <AppShell>
          <div data-testid="page-child">Workstation Content</div>
        </AppShell>,
      );
      expect(screen.getByTestId("page-child")).toBeInTheDocument();
      expect(screen.getByRole("main")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Collapse sidebar" }),
      ).toBeInTheDocument();
    });

    it("bypasses shell chrome on auth pages (/login)", () => {
      currentPathname = "/login";
      render(
        <AppShell>
          <div data-testid="auth-page">Login Screen</div>
        </AppShell>,
      );
      expect(screen.getByTestId("auth-page")).toBeInTheDocument();
      expect(screen.queryByRole("main")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Collapse sidebar" }),
      ).not.toBeInTheDocument();
    });
  });
});
