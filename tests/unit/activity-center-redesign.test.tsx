import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { ActivityCenterClient } from "@/components/activity/activity-center";
import type { ActivityEvent, ActivityFeedResult } from "@/types/activity";

const nowIso = new Date().toISOString();
const twoHoursAgoIso = new Date(Date.now() - 2 * 3_600_000).toISOString();

const mockEvents: ActivityEvent[] = [
  {
    id: "act-1",
    userId: "user-1",
    projectId: "proj-1",
    projectSlug: "online-bookstore",
    projectTitle: "Online Bookstore",
    projectNumber: 1,
    category: "ci",
    type: "ci.workflow_run.failed",
    severity: "critical",
    title: "CI Workflow Build Failed",
    description: "Vitest unit tests exited with status 1 on branch main.",
    sourceProvider: "github",
    dedupKey: "github:run:1:failure",
    actionUrl: "https://github.com/arman080325/online-bookstore/actions/runs/1",
    isRead: false,
    readAt: null,
    metadata: {
      branch: "main",
      runId: 42,
    },
    createdAt: nowIso,
  },
  {
    id: "act-2",
    userId: "user-1",
    projectId: "proj-31",
    projectSlug: "social-media-platform",
    projectTitle: "Social Media Platform",
    projectNumber: 31,
    category: "deployment",
    type: "vercel.deployment.ready",
    severity: "success",
    title: "Production Deployment Ready",
    description: "Deployed commit a1b2c3d to Vercel production.",
    sourceProvider: "vercel",
    dedupKey: "vercel:dep:1:ready",
    actionUrl: "https://social.vercel.app",
    isRead: true,
    readAt: nowIso,
    metadata: {
      url: "social.vercel.app",
    },
    createdAt: twoHoursAgoIso,
  },
];

const mockFeed: ActivityFeedResult = {
  events: mockEvents,
  pagination: {
    page: 1,
    limit: 20,
    total: 2,
    totalPages: 1,
  },
  unreadCount: 1,
};

const mockProjects = [
  { id: "proj-1", number: 1, title: "Online Bookstore", slug: "online-bookstore" },
  {
    id: "proj-31",
    number: 31,
    title: "Social Media Platform",
    slug: "social-media-platform",
  },
];

describe("Milestone 6 — Redesigned Activity Center", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders logbook entries, unread distinction, project links, and detail inspector", () => {
    render(<ActivityCenterClient initialFeed={mockFeed} projects={mockProjects} />);

    expect(screen.getByRole("heading", { name: "Activity" })).toBeInTheDocument();
    expect(screen.getAllByText("CI Workflow Build Failed").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getByText("Production Deployment Ready")).toBeInTheDocument();
    expect(screen.getAllByText(/UNREAD/i).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByRole("link", { name: /#001.*Online Bookstore/i }).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("expands sanitized event metadata without rendering unsafe attributes", () => {
    render(<ActivityCenterClient initialFeed={mockFeed} projects={mockProjects} />);

    const expandBtn = screen.getAllByRole("button", { name: /Expand metadata/i })[0];
    fireEvent.click(expandBtn);

    expect(screen.getAllByText("branch").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("main").length).toBeGreaterThanOrEqual(1);
  });

  it("fetches filtered feed when switching tabs or searching", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        events: [mockEvents[0]],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        unreadCount: 1,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ActivityCenterClient initialFeed={mockFeed} projects={mockProjects} />);

    fireEvent.click(screen.getByRole("tab", { name: /CI\/CD/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/activity?"),
        expect.anything(),
      );
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("category=ci"),
      expect.anything(),
    );
  });

  it("marks individual event as read and rolls back if API fails", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ActivityCenterClient initialFeed={mockFeed} projects={mockProjects} />);

    const markReadButtons = screen.getAllByRole("button", { name: "Mark as read" });
    fireEvent.click(markReadButtons[0]);

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to update read status\. Reverted local state\./i),
      ).toBeInTheDocument();
    });
  });

  it("marks all unread notifications as read via /api/activity/mark-all-read", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, count: 1 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ActivityCenterClient initialFeed={mockFeed} projects={mockProjects} />);

    const markAllBtn = screen.getByRole("button", { name: /Mark all as read/i });
    fireEvent.click(markAllBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/activity/mark-all-read", {
        method: "POST",
      });
    });
    expect(markAllBtn).toBeDisabled();
  });

  it("handles Sync Intelligence success and error states cleanly", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "GitHub API rate limit reached." }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          synced: true,
          newEventsCount: 2,
          unreadCount: 3,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockFeed,
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<ActivityCenterClient initialFeed={mockFeed} projects={mockProjects} />);

    const syncBtn = screen.getByRole("button", { name: /Sync Intelligence/i });
    fireEvent.click(syncBtn);

    await waitFor(() => {
      expect(screen.getByText("GitHub API rate limit reached.")).toBeInTheDocument();
    });

    fireEvent.click(syncBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/On-demand sync complete: 2 new events recorded\./i),
      ).toBeInTheDocument();
    });
  });

  it("renders clear empty state when feed has no events", () => {
    render(
      <ActivityCenterClient
        initialFeed={{
          events: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
          unreadCount: 0,
        }}
        projects={mockProjects}
      />,
    );

    expect(screen.getByText("No activity events recorded yet.")).toBeInTheDocument();
  });
});
