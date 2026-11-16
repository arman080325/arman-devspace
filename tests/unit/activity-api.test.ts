import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getActivityFeedRoute } from "@/app/api/activity/route";
import { POST as syncActivityRoute } from "@/app/api/activity/sync/route";
import { PATCH as patchActivityRoute } from "@/app/api/activity/[id]/route";
import { POST as markAllReadRoute } from "@/app/api/activity/mark-all-read/route";
import * as apiHelpers from "@/lib/api-helpers";
import * as activityService from "@/services/activity";
import type { ActivityEvent, ActivityFeedResult } from "@/types/activity";

describe("Activity Center API Endpoints", () => {
  const mockUser = {
    id: "user-test-1",
    email: "test@example.com",
    name: "Test User",
    role: "owner" as const,
  };

  const sampleEvent: ActivityEvent = {
    id: "act-1",
    userId: "user-test-1",
    projectId: "project-1",
    projectSlug: "audio-analysis-engine",
    projectTitle: "Audio Analysis Engine",
    projectNumber: 1,
    category: "ci",
    type: "ci.workflow_run.succeeded",
    severity: "success",
    title: "CI Passed",
    description: "All unit tests completed.",
    sourceProvider: "github",
    dedupKey: "github:run:1:success",
    actionUrl: "https://github.com/org/repo/actions/runs/1",
    isRead: false,
    readAt: null,
    metadata: null,
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/activity", () => {
    it("returns 401 if unauthenticated", async () => {
      vi.spyOn(apiHelpers, "requireApiSession").mockResolvedValue({
        response: NextResponse.json(
          { error: "Authentication required" },
          { status: 401 },
        ),
      });

      const req = new NextRequest("http://localhost:3000/api/activity");
      const res = await getActivityFeedRoute(req);
      expect(res.status).toBe(401);
    });

    it("returns paginated feed and unread count for authenticated user", async () => {
      vi.spyOn(apiHelpers, "requireApiSession").mockResolvedValue({
        user: mockUser,
      });

      const mockFeed: ActivityFeedResult = {
        events: [sampleEvent],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
        unreadCount: 1,
      };

      vi.spyOn(activityService, "getActivityFeed").mockResolvedValue(mockFeed);

      const req = new NextRequest(
        "http://localhost:3000/api/activity?page=1&limit=20&category=ci&status=unread",
      );
      const res = await getActivityFeedRoute(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.events).toHaveLength(1);
      expect(data.pagination.page).toBe(1);
      expect(data.unreadCount).toBe(1);
      expect(activityService.getActivityFeed).toHaveBeenCalledWith(
        "user-test-1",
        expect.objectContaining({
          category: "ci",
          status: "unread",
          page: 1,
          limit: 20,
        }),
      );
    });
  });

  describe("POST /api/activity/sync", () => {
    it("returns 401 if unauthenticated", async () => {
      vi.spyOn(apiHelpers, "requireApiSession").mockResolvedValue({
        response: NextResponse.json(
          { error: "Authentication required" },
          { status: 401 },
        ),
      });

      const req = new NextRequest("http://localhost:3000/api/activity/sync", {
        method: "POST",
      });
      const res = await syncActivityRoute(req);
      expect(res.status).toBe(401);
    });

    it("triggers sync and returns sync metrics for authenticated user", async () => {
      vi.spyOn(apiHelpers, "requireApiSession").mockResolvedValue({
        user: mockUser,
      });

      vi.spyOn(activityService, "syncProjectActivityIntelligence").mockResolvedValue({
        synced: true,
        projectsChecked: 5,
        newEventsCount: 2,
        totalEventsCount: 10,
        unreadCount: 3,
      });

      const req = new NextRequest("http://localhost:3000/api/activity/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectSlug: "audio-analysis-engine" }),
      });

      const res = await syncActivityRoute(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.synced).toBe(true);
      expect(json.newEventsCount).toBe(2);
      expect(activityService.syncProjectActivityIntelligence).toHaveBeenCalledWith(
        "user-test-1",
        "audio-analysis-engine",
      );
    });
  });

  describe("PATCH /api/activity/[id]", () => {
    it("returns 401 if unauthenticated", async () => {
      vi.spyOn(apiHelpers, "requireApiSession").mockResolvedValue({
        response: NextResponse.json(
          { error: "Authentication required" },
          { status: 401 },
        ),
      });

      const req = new NextRequest("http://localhost:3000/api/activity/act-1", {
        method: "PATCH",
        body: JSON.stringify({ isRead: true }),
      });
      const res = await patchActivityRoute(req, {
        params: Promise.resolve({ id: "act-1" }),
      });
      expect(res.status).toBe(401);
    });

    it("prevents cross-user mutations and returns 404 if event is not owned by user", async () => {
      vi.spyOn(apiHelpers, "requireApiSession").mockResolvedValue({
        user: mockUser,
      });

      vi.spyOn(activityService, "markActivityAsRead").mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/activity/act-other-user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });

      const res = await patchActivityRoute(req, {
        params: Promise.resolve({ id: "act-other-user" }),
      });
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error).toMatch(/not found or access denied/i);
    });

    it("updates read status when authorized", async () => {
      vi.spyOn(apiHelpers, "requireApiSession").mockResolvedValue({
        user: mockUser,
      });

      vi.spyOn(activityService, "markActivityAsRead").mockResolvedValue({
        ...sampleEvent,
        isRead: true,
        readAt: new Date().toISOString(),
      });

      const req = new NextRequest("http://localhost:3000/api/activity/act-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });

      const res = await patchActivityRoute(req, {
        params: Promise.resolve({ id: "act-1" }),
      });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.event.isRead).toBe(true);
    });
  });

  describe("POST /api/activity/mark-all-read", () => {
    it("marks all user activities as read and returns count", async () => {
      vi.spyOn(apiHelpers, "requireApiSession").mockResolvedValue({
        user: mockUser,
      });

      vi.spyOn(activityService, "markAllActivitiesAsRead").mockResolvedValue({
        count: 4,
      });

      const res = await markAllReadRoute();
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.count).toBe(4);
    });
  });
});
